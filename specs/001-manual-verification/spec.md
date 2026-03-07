# Feature Specification: Manual Verification

**Feature Branch**: `001-manual-verification`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description for automated and manual candidate-to-client matching logic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Smart Search Candidate to Client (Priority: P1)

As a CRM user adding a new candidate, I want the system to automatically search for matching clients so that I can avoid creating duplicate records.

**Why this priority**: Essential for data integrity and preventing duplicate client entries.

**Independent Test**: Can be tested by opening the Manual Search popup with a candidate's data and verifying that potential matches are displayed with correct confidence scores.

**Acceptance Scenarios**:

1. **Given** I am in the "Add Candidate" modal, **When** I click the "Manual Verification" button, **Then** a modal opens and automatically performs a "Smart Search" using the candidate's data.
2. **Given** multiple matches are found, **When** the results are displayed, **Then** up to 10 potential matches are shown with required details (Client ID, Type, Full Name, Primary Mobile, City/Area, and Confidence Icon).

---

### User Story 2 - Link Candidate to Existing Client (Priority: P1)

As a CRM user, I want to link a candidate to an existing client record when a match is found.

**Why this priority**: Core functionality of the manual verification process.

**Independent Test**: Can be tested by selecting a search result and clicking "Link & Merge", then verifying the candidate is associated with that client.

**Acceptance Scenarios**:

1. **Given** a correct match is found in the search results, **When** I click "[Link & Merge]", **Then** the candidate data is merged/linked with the selected client record.

---

### User Story 3 - Proceed Without Match (Priority: P2)

As a CRM user, I want to proceed with adding a candidate even if no matching client is found.

**Why this priority**: Allows the workflow to continue when no duplicates exist.

**Independent Test**: Can be tested by clicking "[No Match - Proceed]" when no results are found or results are irrelevant.

**Acceptance Scenarios**:

1. **Given** no matches are found or none are correct, **When** I click "[No Match - Proceed]", **Then** the system proceeds to the "Trust Confirmation" step.

---

### Edge Cases

- **Zero Results**: How does the system handle a search that returns no matches? (Show a clear "No potential matches found" message).
- **Missing Data**: What if the candidate only has a first name and no mobile/city? (Search logic should degrade gracefully to Low Confidence or No Match).
- **Many Matches**: What if there are more than 10 matches? (Limit display to top 10 as specified).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Manual Search" popup/modal trigger in the candidate creation flow.
- **FR-002**: System MUST perform an automatic search on the `Clients` table upon modal open using candidate details.
- **FR-003**: Search logic MUST prioritize matches as follows:
    - **High Confidence**: Exact match on Primary Mobile or any Secondary/Additional Mobile numbers.
    - **Medium Confidence**: Fuzzy match on First Name + Last Name (using 85% similarity threshold).
    - **Low Confidence**: Fuzzy match on First Name AND exact match on City/Area.
- **FR-004**: System MUST display up to 10 potential matches with the following fields: Client ID, Client Type (OP, FOP, Lead), Full Name, Primary Mobile, City/Area, and Confidence Score (using Green/Yellow/Red icons for High/Medium/Low).
- **FR-005**: System MUST provide a "[Link & Merge]" action for each search result. "Merge" MUST append new candidate data (e.g., additional mobile numbers) to the existing client record without overwriting existing data.
- **FR-006**: System MUST provide a "[No Match - Proceed]" action to continue to the next step (Trust Confirmation).

### Key Entities

- **Candidate**: Temporary record being added to the system.
- **Client**: Existing system record against which candidates are verified.
- **Confidence Score**: A metric (High/Medium/Low) based on match quality.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a manual verification search in under 5 seconds from trigger click.
- **SC-002**: 100% of exact mobile number matches are correctly flagged as "High Confidence".
- **SC-003**: System accurately filters and displays no more than 10 results even when more exist in the database.
- **SC-004**: Users can successfully link a candidate to a client with a single click after a match is identified.

