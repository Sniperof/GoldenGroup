import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const selectFields = `
  id, first_name AS "firstName", last_name AS "lastName", nickname, mobile,
  address_text AS "addressText", owner_user_id AS "ownerUserId",
  status, referral_sheet_id AS "referralSheetId",
  referral_date AS "referralDate", referral_reason AS "referralReason",
  referral_type AS "referralType", referral_origin_channel AS "referralOriginChannel",
  referral_name_snapshot AS "referralNameSnapshot", referral_entity_id AS "referralEntityId",
  referral_confirmation_status AS "referralConfirmationStatus",
  candidate_notes AS "candidateNotes",
  duplicate_flag AS "duplicateFlag", duplicate_type AS "duplicateType",
  duplicate_reference_id AS "duplicateReferenceId",
  converted_to_lead_id AS "convertedToLeadId",
  created_at AS "createdAt", created_by AS "createdBy"
`;

router.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT ${selectFields} FROM candidates ORDER BY id`);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const c = req.body;
  const { rows } = await pool.query(
    `INSERT INTO candidates (first_name, last_name, nickname, mobile, address_text,
      owner_user_id, status, referral_sheet_id, referral_date, referral_reason,
      referral_type, referral_origin_channel, referral_name_snapshot, referral_entity_id,
      referral_confirmation_status, candidate_notes, duplicate_flag, duplicate_type,
      duplicate_reference_id, converted_to_lead_id, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING ${selectFields}`,
    [c.firstName, c.lastName || null, c.nickname, c.mobile, c.addressText || '',
     c.ownerUserId || null, c.status || 'New', c.referralSheetId || null,
     c.referralDate || null, c.referralReason || null, c.referralType || null,
     c.referralOriginChannel || null, c.referralNameSnapshot || null,
     c.referralEntityId || null, c.referralConfirmationStatus || 'Pending',
     c.candidateNotes || null, c.duplicateFlag || false, c.duplicateType || null,
     c.duplicateReferenceId || null, c.convertedToLeadId || null, c.createdBy || null]
  );
  res.json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const c = req.body;
  const { rows } = await pool.query(
    `UPDATE candidates SET first_name=$1, last_name=$2, nickname=$3, mobile=$4,
      address_text=$5, owner_user_id=$6, status=$7, referral_sheet_id=$8,
      referral_date=$9, referral_reason=$10, referral_type=$11, referral_origin_channel=$12,
      referral_name_snapshot=$13, referral_entity_id=$14, referral_confirmation_status=$15,
      candidate_notes=$16, duplicate_flag=$17, duplicate_type=$18,
      duplicate_reference_id=$19, converted_to_lead_id=$20, created_by=$21
    WHERE id=$22 RETURNING ${selectFields}`,
    [c.firstName, c.lastName || null, c.nickname, c.mobile, c.addressText || '',
     c.ownerUserId || null, c.status || 'New', c.referralSheetId || null,
     c.referralDate || null, c.referralReason || null, c.referralType || null,
     c.referralOriginChannel || null, c.referralNameSnapshot || null,
     c.referralEntityId || null, c.referralConfirmationStatus || 'Pending',
     c.candidateNotes || null, c.duplicateFlag || false, c.duplicateType || null,
     c.duplicateReferenceId || null, c.convertedToLeadId || null, c.createdBy || null,
     req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM candidates WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
