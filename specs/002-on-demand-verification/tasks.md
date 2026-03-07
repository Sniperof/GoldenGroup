# Tasks: On-Demand Verification (v2)

## Phase 1: Foundational Updates
- [x] T001 [MODIFY] Update `CandidateStatus` in `src/lib/types.ts` to include `'Prospect'`.
- [x] T002 [MODIFY] Update `addCandidate` in `useCandidateStore.ts` to default status to `'Prospect'`.

## Phase 2: Refactor Entry Flow
- [x] T003 [MODIFY] Remove `ManualSearchModal` and "Manual Verification" button from `AddCandidateModal.tsx`.
- [x] T004 Verify that saving a candidate with a duplicate number does not trigger any UI popups.

## Phase 3: Candidates Table Actions
- [x] T005 [MODIFY] Integrate `ManualSearchModal` into `Clients.tsx`.
- [x] T006 [MODIFY] Add "Actions" column logic to Candidates Table in `Clients.tsx`.
- [x] T007 Implement `[🔍 Manual Search]` button in the table.
- [x] T008 Implement `[💡 Review Suggestions]` button (conditional on `duplicateFlag`).
- [x] T009 Implement `[✅ Convert to Lead]` button with confirmation.

## Phase 4: Verification & Polish
- [x] T010 Verify "Link & Merge" from table-based modal correctly updates storage.
- [x] T011 Verify status transitions and UI responsiveness.
- [x] T012 Fix any linting/type errors introduced.
