# Tasks: Manual Verification

**Feature Name**: Manual Verification
**Branch**: `001-manual-verification`

## Phase 1: Setup
- [x] T001 Initialize search utility file at `src/lib/searchUtils.ts`

## Phase 2: Foundational
- [x] T002 [P] Implement `calculateSimilarity` (Levenshtein) in `src/lib/searchUtils.ts`
- [x] T003 [P] Implement `performSmartSearch` logic in `src/lib/searchUtils.ts`

## Phase 3: User Story 1 - Smart Search Candidate to Client
**Story Goal**: Automatically search for matching clients upon opening the manual verification modal.
**Independent Test Criteria**: Opening the modal triggers a search and displays results with confidence scores.

- [x] T004 [P] [US1] Create `ManualSearchModal.tsx` UI skeleton in `src/components/candidates/`
- [x] T005 [P] [US1] Implement result list display with confidence icons in `src/components/candidates/ManualSearchModal.tsx`
- [x] T006 [US1] Add "Manual Verification" button to `src/components/candidates/AddCandidateModal.tsx`
- [x] T007 [US1] Integrate `ManualSearchModal` into `src/components/candidates/AddCandidateModal.tsx`

## Phase 4: User Story 2 - Link Candidate to Existing Client
**Story Goal**: Link a candidate to an existing client and append their mobile data.
**Independent Test Criteria**: Clicking "Link & Merge" updates the client's record in storage.

- [x] T008 [US2] Implement data merging logic (appending mobile to contacts) in `src/components/candidates/AddCandidateModal.tsx`
- [x] T009 [US2] Implement "Link & Merge" callback in `src/components/candidates/ManualSearchModal.tsx`

## Phase 5: User Story 3 - Proceed Without Match
**Story Goal**: Continue the workflow if no match is found.
**Independent Test Criteria**: Clicking "[No Match - Proceed]" continues to the next step.

- [x] T010 [US3] Implement "[No Match - Proceed]" action and modal closure in `src/components/candidates/ManualSearchModal.tsx`

## Phase 6: Polish & Cross-Cutting Concerns
- [x] T011 Refine Lucide icons and Green/Yellow/Red indicators in `src/components/candidates/ManualSearchModal.tsx`
- [x] T012 Verify all Arabic translations match the existing CRM UI style.

## Dependencies
US1 → US2, US3

## Parallel Execution Examples
- T002 and T004 can be implemented in parallel.
- T003 and T005 can be implemented in parallel.
