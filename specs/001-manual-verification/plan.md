# Implementation Plan: Manual Verification

Implement a "Smart Search" mechanism and manual verification modal to allow CRM users to link new candidates to existing clients, preventing duplicate data.

## Proposed Changes

### Core Logic & Utilities

#### [NEW] [searchUtils.ts](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/lib/searchUtils.ts)
- Implement `calculateSimilarity(s1, s2)` using a simple Levenshtein or Jaro-Winkler algorithm.
- Implement `performSmartSearch(candidate, clients)`:
    - **High**: Matches `candidate.mobile` against `client.mobile` or `client.contacts[].number`.
    - **Medium**: Matches `candidate.firstName + candidate.lastName` against `client.name` with 85%+ similarity.
    - **Low**: Matches `candidate.firstName` (85% similarity) AND exact match on `neighborhood`.
- Return top 10 matches sorted by confidence.

### UI Components

#### [NEW] [ManualSearchModal.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/components/candidates/ManualSearchModal.tsx)
- Modal that displays search results in a list.
- Show Client ID, Type, Full Name, mobile, and neighborhood.
- Confidence icons: High (Green), Medium (Yellow), Low (Red).
- Actions:
    - `[Link & Merge]`: Links candidate to client ID and appends candidate data.
    - `[No Match - Proceed]`: Closes modal and continues flow.

#### [MODIFY] [AddCandidateModal.tsx](file:///c:/Users/Ibrahim%20Obaid/.gemini/antigravity/scratch/golden_crm_react/src/components/candidates/AddCandidateModal.tsx)
- Add "Manual Verification" button near the mobile input.
- Integrate `ManualSearchModal`.
- On `onLink`, perform the merge logic:
    - Load `clients` from storage.
    - Append candidate mobile to the matched client's `contacts` array if not already present.
    - Save updated `clients`.
    - Close modals and show success toast.

## Verification Plan

### Automated Tests
- Create a research/test script to verify `performSmartSearch` logic with various mock cases (exact mobile, fuzzy name, name + area).

### Manual Verification
- Open "Add Candidate" modal.
- Enter a mobile number known to exist in the "Clients" list.
- Click "Manual Verification".
- Verify the existing client appears with "High Confidence".
- Click "Link & Merge" and verify the mobile number is added to the client's record in the "Clients" page.
- Test "No Match - Proceed" and verify it closes the modal.
