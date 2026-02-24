# Implementation Plan: On-Demand Verification (v2)

Update the Manual Verification feature to be an on-demand process triggered from the Candidates Table, rather than an automatic step during data entry.

## Proposed Changes

### Core Types & State
#### [MODIFY] [types.ts](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/lib/types.ts)
- Update `CandidateStatus` union to include `'Prospect'`.
- Ensure `'Prospect'` is the default for new candidates.

#### [MODIFY] [useCandidateStore.ts](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/hooks/useCandidateStore.ts)
- Update `addCandidate` to default the status to `'Prospect'`.
- Validate that `duplicateFlag` logic correctly identifies potential matches on creation.

### Candidate Entry Flow
#### [MODIFY] [AddCandidateModal.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/components/candidates/AddCandidateModal.tsx)
- Remove the `ManualSearchModal` import and integration.
- Remove the "Manual Verification" button next to the mobile field.
- Ensure saving a candidate follows the new "fast entry" flow without interruptions.

### Candidates Table (Management)
#### [MODIFY] [Clients.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/pages/Clients.tsx)
- Import `ManualSearchModal` and `Search`, `Lightbulb`, `CheckCircle` icons.
- Add local state for `isSearchModalOpen` and `activeCandidate` for verification.
- Update the `actions` prop in the candidates `SmartTable`:
    - **[🔍 Manual Search]**: Opens `ManualSearchModal` for the row's candidate.
    - **[💡 Review Suggestions]**: Visible only if `c.duplicateFlag` is true.
    - **[✅ Convert to Lead]**: Calls `qualifyCandidate` with a confirmation step.

## Verification Plan

### Automated Tests
- N/A (Mostly UI integration and state transitions).

### Manual Verification
1. **Data Entry**: Add a new candidate with a known duplicate number. Verify no modal pops up.
2. **Table Display**: Go to the Candidates tab. Verify the new candidate is listed as 'Prospect'.
3. **Actions Column**:
    - Verify [🔍 Search] button opens the modal and search results show the duplicate Client.
    - Verify [💡 Suggestions] button appears only for the flagged candidate.
    - Verify [✅ Convert] button successfully moves the candidate to the Clients tab (Lead).
4. **Link & Merge**: Test the merging logic from the table-triggered modal.
