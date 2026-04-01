# Security Audit Report

**Repository:** GoldenGroup CRM
**Audit Date:** 2026-03-31
**Auditor:** Claude Code (defensive audit — authorized by repository owner)

---

## Executive Summary

**12 findings** were identified across 4 severity levels. The most critical issue is a live SSH private key committed to the repository and permanently in git history. Production database credentials (including the PostgreSQL superuser password) are also present in git history. Several issues have been fixed in the current working tree; critical issues in git history require manual remediation with `git filter-repo`.

**Issues fixed in this audit (current tree):**
- Removed hardcoded JWT secret fallback from source code
- Added startup validation requiring `JWT_SECRET` environment variable
- Removed SSH keypair, log files, and test credential files from git tracking
- Removed JWT Bearer token from `.claude/settings.local.json`
- Hardened `.gitignore` to cover SSH keys, certs, logs, dumps, backups
- Restricted `.env` file permissions to `600` (owner-only)
- Created `.env.example` with safe placeholder values

**Issues requiring manual action (see below):**
- SSH key must be revoked and server access audited
- Passwords exposed in git history must be rotated
- Git history must be rewritten to expunge secrets

---

## Findings Table

| # | Severity | Classification | File / Location | Secret Type | Status |
|---|----------|----------------|-----------------|-------------|--------|
| 1 | CRITICAL | Confirmed Secret | `newssh` (commit `69868df`) | SSH ED25519 private key | Untracked; **history rewrite required** |
| 2 | CRITICAL | Confirmed Secret | `.env` (working tree) | PostgreSQL production password (`crm_user`) | Permissions fixed to 600; **rotate password** |
| 3 | CRITICAL | Confirmed Secret | `.env` in git history (commits `4f03ec2`→`91ca24f`) | PostgreSQL **superuser** password | **History rewrite + password rotation required** |
| 4 | HIGH | Confirmed Secret | `server/middleware/auth.ts:19` | Hardcoded JWT fallback secret | **Fixed** — fallback removed, env var now required |
| 5 | HIGH | Confirmed Secret | `server/schema.ts` (history) + `test_job_applications.ts:31` | Default plaintext passwords (system_admin, hr_manager, hr_assistant) | Test file untracked; **rotate DB account passwords** |
| 6 | HIGH | Confirmed Secret | `.claude/settings.local.json:14` | JWT Bearer token (HR_MANAGER role) | **Fixed** — token removed from file |
| 7 | MEDIUM | Insecure Configuration | `.env` | World-readable file permissions | **Fixed** — `chmod 600` applied |
| 8 | MEDIUM | Sensitive Artifact | `branch_error.log`, `server_run_err.txt` | Developer PII (Windows username, local paths) | **Fixed** — untracked from git |
| 9 | MEDIUM | Confirmed Secret | `newssh`, `newssh.pub` | SSH keypair actively tracked | **Fixed** — untracked from git; **history rewrite required** |
| 10 | MEDIUM | Insecure Configuration | `.gitignore` | Missing rules for keys, logs, dumps, `.claude/` | **Fixed** — comprehensive rules added |
| 11 | LOW | Sensitive Artifact | Git commit metadata | Production hostname `srv1310374.hstgr.cloud` in author field | Informational; configure git identity on server |
| 12 | LOW | Insecure Configuration | `server/middleware/auth.ts` | Silent JWT secret fallback with no startup validation | **Fixed** — now throws at startup if not set |

---

## Files Changed in This Audit

| File | Change |
|------|--------|
| `.gitignore` | Added rules for SSH keys, certs, logs, dumps, backups, `.claude/settings.local.json` |
| `server/middleware/auth.ts` | Removed hardcoded fallback; added startup `throw` if `JWT_SECRET` unset |
| `.claude/settings.local.json` | Removed JWT Bearer token from allowed commands |
| `.env` | Permissions changed from `644` to `600` |
| `.env.example` | Created with placeholder values (safe to commit) |
| `newssh` | Removed from git tracking (`git rm --cached`) |
| `newssh.pub` | Removed from git tracking (`git rm --cached`) |
| `branch_error.log` | Removed from git tracking (`git rm --cached`) |
| `server_run_err.txt` | Removed from git tracking (`git rm --cached`) |
| `test_job_applications.ts` | Removed from git tracking (`git rm --cached`) |
| `SECURITY_AUDIT.md` | This file — created |

---

## Remaining Manual Actions Required

### 1. IMMEDIATE — Revoke SSH Key (Finding 1)

The private key in `newssh` must be considered compromised. Revoke it on every server where it was authorized:

```bash
# On each server that may have this key authorized:
# Remove the matching public key line from authorized_keys
grep -v "firstproject328@gmail.com" ~/.ssh/authorized_keys > /tmp/ak_new
mv /tmp/ak_new ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Then generate a new keypair and install only the new public key.

---

### 2. IMMEDIATE — Rotate All Exposed Passwords (Findings 2, 3, 5)

```bash
# Rotate the crm_user application password
psql -U postgres -c "ALTER USER crm_user PASSWORD 'NEW_STRONG_PASSWORD';"

# Rotate the postgres superuser password
psql -U postgres -c "ALTER USER postgres PASSWORD 'NEW_STRONG_PASSWORD';"

# Rotate default application account passwords
psql -U postgres -d golden_crm_db -c "UPDATE users SET password_hash = ... WHERE username IN ('system_admin','hr_manager','hr_assistant');"
```

Update `.env` with the new `crm_user` password after rotation.

---

### 3. REQUIRED — Generate a Strong JWT Secret

```bash
# Generate a cryptographically strong secret
openssl rand -hex 32
# → copy this into your .env as JWT_SECRET=<output>
```

The old secret `golden-crm-dev-secret-2026` is in git history and must be treated as permanently compromised. All tokens signed with it should be invalidated (rotate the secret, which forces re-login for all users).

---

### 4. REQUIRED — Rewrite Git History to Purge Secrets

> **Warning:** History rewriting affects all collaborators. Coordinate before running.
> After running, all open PRs and local clones will need to be re-based or re-cloned.

Install `git filter-repo` if not present:
```bash
pip install git-filter-repo
# or: apt install git-filter-repo
```

Purge committed secret files from all history:
```bash
# Run from repository root
git filter-repo \
  --path newssh --invert-paths \
  --path newssh.pub --invert-paths \
  --path .env --invert-paths \
  --path test_job_applications.ts --invert-paths \
  --path branch_error.log --invert-paths \
  --path server_run_err.txt --invert-paths \
  --force
```

After rewriting, force-push all branches:
```bash
git push origin --force --all
git push origin --force --tags
```

> **If this repository was ever public or accessible to others:** Assume all secrets in history are permanently compromised regardless of history rewrite, because GitHub/others may have cached the old history. Rotate all credentials unconditionally.

---

### 5. OPTIONAL — Fix Git Identity on Production Server

To avoid leaking the server hostname in future commits:
```bash
git config --global user.name "GoldenGroup Deploy Bot"
git config --global user.email "deploy@example.com"
```

---

## Risk Notes

- The PostgreSQL **superuser** password was committed in plaintext. This account has full database control. Treat the entire database as potentially compromised until the password is rotated.
- The SSH private key belongs to `firstproject328@gmail.com`. If this key is authorized on the production server (`srv1310374.hstgr.cloud`), any repository reader has had shell access to the server.
- The JWT secret was hardcoded in source code. All tokens issued under the old secret should be considered forgeable by anyone who has read access to git history.
