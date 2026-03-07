# Feature Specification: On-Demand Verification

**Feature Branch**: `002-on-demand-verification`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: Specification Update for "Manual Verification": On-demand search from Candidates Table.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Data Entry (Priority: P1)

As a CRM user, I want to add new candidates quickly without interruption so that I can process high volumes of paper/referral sheets efficiently.

**Why this priority**: Core business need to minimize friction during initial data capture.

**Independent Test**: Can be tested by adding a candidate and verifying no search popup appears during the process.

**Acceptance Scenarios**:
1. **Given** I am in the "Add Candidate" modal, **When** I fill in a duplicate-potential mobile number and save, **Then** the candidate is saved with status 'Prospect' without triggering any search popups.

---

### User Story 2 - Manual Search from Actions (Priority: P1)

As a CRM user, I want to manually trigger the Smart Search for a prospect in the candidates table so that I can verify them when I have time.

**Why this priority**: Essential for the decoupled verification workflow.

**Independent Test**: Can be tested by clicking the search icon in the Actions column and verifying the search modal opens with pre-populated data.

**Acceptance Scenarios**:
1. **Given** a candidate row with status 'Prospect', **When** I click the [🔍 Manual Search] button in the Actions column, **Then** the Smart Search modal opens using that candidate's data.

---

### User Story 3 - Review Suggestions (Priority: P2)

As a CRM user, I want to see a highlight for candidates that have high-confidence matches so that I can prioritize verification for likely duplicates.

**Why this priority**: Improves efficiency by surfacing "easy" matches first.

**Independent Test**: Can be tested by ensuring the [💡 Review Suggestions] button only appears when `duplicateFlag` is true for a row.

**Acceptance Scenarios**:
1. **Given** a Prospect with a system-detected `duplicateFlag`, **When** I view the Actions column, **Then** I see the [💡 Review Suggestions] button.
2. **When** I click [💡 Review Suggestions], **Then** the Smart Search modal opens pre-filtered or highlighted for the potential matches.

---

### User Story 4 - Convert to Lead (Priority: P2)

As a CRM user, I want to directly convert a verified Prospect to a Lead from the table so that I can quickly move them into the next stage of the funnel.

**Why this priority**: Streamlines the conversion flow after manual verification.

**Independent Test**: Can be tested by clicking the convert button and verifying status change after confirmation.

**Acceptance Scenarios**:
1. **Given** a Prospect row, **When** I click [✅ Convert to Lead], **Then** a confirmation prompt appears.
2. **When** I confirm, **Then** the candidate status changes to 'Qualified' (Lead).

---

### Edge Cases

- **Status Transition**: What happens if a Prospect is converted to Lead? The actions column should change or hide these specific verification actions. (Default: Actions are only for 'Prospect' status).
- **Matching on Empty**: How does manual search handle a Prospect that was saved with minimal data? (Degrade to empty or broad search as per search utility).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create new candidates with a default status of 'Prospect'.
- **FR-002**: System MUST add an "Actions" column to the Candidates Table, visible for 'Prospect' rows.
- **FR-003**: The Actions column MUST include a [🔍 Manual Search] button.
- **FR-004**: The Actions column MUST include a [💡 Review Suggestions] button, appearing ONLY when `duplicateFlag` is `true`.
- **FR-005**: The Actions column MUST include a [✅ Convert to Lead] button with a confirmation dialog.
- **FR-006**: "Link & Merge" behavior (as defined in v1) MUST remain functional within the Smart Search modal, updating the target Client and updating the Prospect's lifecycle.
- **FR-007**: The "Add Candidate" modal MUST NOT trigger the search modal automatically.

### Key Entities

- **Candidate (Prospect)**: The entity being verified.
- **duplicateFlag**: A boolean indicating the system has identified a potential match (e.g., via background processing or simple field check during creation).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Data entry speed (time to save a new candidate) remains under 10 seconds per record.
- **SC-002**: 100% of 'Prospect' status candidates have the correct verification actions available in the table.
- **SC-003**: 100% of 'Review Suggestions' buttons correctly link to the detected duplicates.
- **SC-004**: Zero unintended status transitions (e.g., non-prospects showing verification actions).
