# Feature Specification: Emergency Triage & Dispatch System

**Feature ID:** 1-emergency-triage-dispatch
**Version:** 1.0
**Date:** 2026-02-28
**Author:** Antigravity AI (on behalf of Ibrahim Obaid)
**Status:** Draft

---

## Clarifications

### Session 2026-02-28

- Q: Should the EmergencyTicket entity include only 2 statuses (New/Assigned) or be future-proofed with resolution statuses? → A: Include full lifecycle: `'New' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled'`.
- Q: Can the manager change ticket priority after creation, and from where? → A: Priority changeable from both the dashboard table (inline) and the Ticket Details Modal.
- Q: Where should the FAB be positioned (bottom-right or bottom-left)? → A: Bottom-left corner (away from the RTL sidebar).

---

## 1. Overview

### 1.1 Problem Statement

The current "Emergency Maintenance" module is a static, read-only data table that displays pre-populated maintenance requests. It lacks the ability for users to create new emergency tickets from anywhere in the application, offers no clear workflow for assigning technicians, and does not provide device-specific historical context. This results in slow response times, disorganized dispatch, and a poor experience for both operators and managers.

### 1.2 Proposed Solution

Redesign the Emergency Maintenance module into an intelligent **Triage & Dispatch** system with a clear separation of concerns:

1.  **Global Quick-Create:** A persistent Floating Action Button (FAB) available on every screen, allowing any user to rapidly log a new emergency ticket without navigating away from their current task.
2.  **Smart Creation Form:** A guided, multi-step modal that minimizes manual data entry by auto-populating client and device information from existing records.
3.  **Manager's Dashboard:** A dedicated, real-time data table for supervisors and managers to monitor, prioritize, and assign all open emergency tickets.
4.  **Rich Detail View:** A comprehensive ticket detail modal that displays all ticket information alongside the device's technical maintenance history, empowering managers to make informed dispatch decisions.

### 1.3 Target Users

| User Role          | Description                                           | Primary Actions                                     |
|-------------------|-------------------------------------------------------|------------------------------------------------------|
| **Any Staff User** | Telemarketer, Supervisor, or Admin receiving a call    | Create a new emergency ticket via the FAB            |
| **Operations Manager** | Supervisor managing the emergency board              | View dashboard, assign technicians, view ticket details |
| **Technician**    | Field technician (read-only stakeholder in this scope) | Is assigned to a ticket by the manager               |

### 1.4 Business Value

-   **Faster Emergency Intake:** Any user can log a ticket from anywhere in the system in under 60 seconds.
-   **Reduced Dispatch Errors:** Auto-populated client/device data eliminates manual entry mistakes.
-   **Informed Decision-Making:** Managers see the client's rating and the device's maintenance history before dispatching, leading to better technician matching.
-   **End-to-End Visibility:** A centralized dashboard provides real-time status of all emergency tickets.

---

## 2. User Scenarios & Testing

### Scenario 1: Quick Emergency Ticket Creation (Any Staff User)

**Preconditions:** User is logged in and on any page of the application.

| Step | User Action                                                             | Expected Result                                                                                                |
|------|-------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| 1    | User clicks the floating "+" button in the bottom-left corner.           | A speed-dial menu animates open, revealing action shortcuts.                                                   |
| 2    | User clicks "🚨 طلب طوارئ" (Emergency Request).                        | The `NewEmergencyTicketModal` opens in a full-screen overlay.                                                  |
| 3    | User types a client's name or phone number into the smart search field.  | A dropdown of matching clients appears in real-time as the user types.                                         |
| 4    | User selects a client from the dropdown.                                 | The form auto-fills: Client Name, Address, Client Rating, and a dropdown of the client's registered devices.   |
| 5    | User selects the relevant device/contract from the device dropdown.      | The selected device is highlighted and ready for submission.                                                   |
| 6    | User fills in "Problem Description" and optionally "Call Notes."         | The text fields accept free-text input.                                                                        |
| 7    | User optionally uploads an attachment (e.g., a photo).                   | The file appears in the attachment list.                                                                       |
| 8    | User clicks "إرسال الطلب" (Submit Request).                             | The modal closes. The ticket is saved with status "New" and priority "Normal." A success notification appears.  |

### Scenario 2: Manager Reviewing and Assigning a Ticket

**Preconditions:** Manager is on the Emergency Tasks dashboard page.

| Step | User Action                                                              | Expected Result                                                                                         |
|------|--------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| 1    | Manager navigates to "العمليات والمهام > طوارئ" in the sidebar.            | The Emergency Tasks dashboard loads, showing a table of all open/recent emergency tickets.              |
| 2    | Manager scans the table columns: Priority, Status, Client & Device, etc. | All columns are visible with correct data. New, unassigned tickets are clearly identifiable.             |
| 3    | Manager clicks the "[Assign]" button on an unassigned ticket.            | An assignment interface appears (inline or dropdown) listing available technicians.                     |
| 4    | Manager selects a technician.                                            | The ticket's status changes from "New" to "Assigned." The technician's name appears in the row.          |
| 5    | Manager clicks "[View Details]" on any ticket.                           | The `TicketDetailsModal` opens.                                                                         |

### Scenario 3: Viewing Ticket Details with Technical History

**Preconditions:** Manager is viewing the Emergency Tasks dashboard.

| Step | User Action                                                | Expected Result                                                                                                                        |
|------|------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| 1    | Manager clicks "[View Details]" on a ticket.                | The `TicketDetailsModal` opens showing all ticket information.                                                                          |
| 2    | Manager scrolls to the "Technical History" section.         | A chronological list of past maintenance visits for the *specific device/contract* linked to the ticket is displayed.                   |
| 3    | Each history entry shows visit date, type, technician, and outcome. | Data is pulled from existing maintenance request and visit records associated with the same contract/device.                             |

### Scenario 4: Edge Case — Client with No Registered Devices

| Step | User Action                                                   | Expected Result                                                                                                                   |
|------|---------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| 1    | User creates a ticket and selects a client with no contracts.  | The device dropdown shows an empty state message: "لا توجد أجهزة مسجلة لهذا الزبون" (No registered devices for this client).       |
| 2    | User can still submit the ticket without selecting a device.   | The ticket is created with the device field marked as "غير محدد" (Unspecified), allowing the manager to handle it manually.        |

### Scenario 5: Edge Case — Smart Search with No Results

| Step | User Action                                                | Expected Result                                                                                      |
|------|------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| 1    | User types a name/number that matches no existing clients.  | The search dropdown shows: "لم يتم العثور على نتائج" (No results found).                             |
| 2    | User cannot proceed to auto-fill.                           | The submit button remains disabled until a valid client is selected.                                 |

---

## 3. Functional Requirements

### FR-1: Global Floating Action Button (FAB)

| Req ID | Requirement                                                                                                     | Acceptance Criteria                                                                                                  |
|--------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| FR-1.1 | A floating action button (FAB) must be visible on every page of the application.                                 | The FAB is rendered in the bottom-left corner (LTR layout, left side) and is always visible.                         |
| FR-1.2 | Clicking the FAB must reveal a speed-dial menu with at least one option: "🚨 طلب طوارئ."                          | The menu animates into view with a fan-out or slide-up motion.                                                       |
| FR-1.3 | The "طلب طوارئ" option must be styled with a **red icon and red text** to visually signify urgency.              | The color is distinct from other menu options and immediately recognizable as high-priority.                          |
| FR-1.4 | Clicking "طلب طوارئ" must open the `NewEmergencyTicketModal`.                                                    | The modal opens as a centered overlay.                                                                               |
| FR-1.5 | Clicking outside the speed-dial menu must close it without triggering any action.                                 | The menu closes gracefully with an animation.                                                                        |

### FR-2: New Emergency Ticket Modal (Smart Form)

| Req ID | Requirement                                                                                                     | Acceptance Criteria                                                                                                  |
|--------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| FR-2.1 | The modal must start with a single **smart search input** for finding a Client by name or phone number.          | Search results appear as a dropdown list matching client name or primary contact number.                              |
| FR-2.2 | On selecting a client, the form must **auto-populate**: Client Name, Address, and Client Rating.                 | Fields are displayed as read-only info cards showing the auto-filled data.                                           |
| FR-2.3 | On selecting a client, a **dropdown of that client's registered devices/contracts** must appear.                 | The dropdown lists all active contracts for the selected client, showing device model name and serial number.         |
| FR-2.4 | The user must manually fill: **Problem Description** (required) and **Call Notes** (optional).                   | "Problem Description" is validated as required (non-empty). "Call Notes" is optional.                                |
| FR-2.5 | The modal must support optional **file attachments** (e.g., images).                                             | The user can attach one or more files. Files are displayed as a list with remove capability.                         |
| FR-2.6 | The **Call Receiver** field must be auto-filled with the currently logged-in user's name.                        | The field is read-only and pre-populated.                                                                            |
| FR-2.7 | On submission, the ticket must be saved with a status of **"New"** and a default priority of **"Normal."**       | The system persists the data and the ticket appears on the Emergency Tasks dashboard immediately.                    |
| FR-2.8 | The modal must be usable for **creation only** — it does not support editing existing tickets.                   | There is no "edit" mode for this modal.                                                                              |

### FR-3: Emergency Tasks Dashboard

| Req ID | Requirement                                                                                                     | Acceptance Criteria                                                                                                  |
|--------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| FR-3.1 | The dashboard must display a dynamic data table of all emergency tickets.                                        | The table loads and displays data from the application's data store.                                                 |
| FR-3.2 | Table columns must include: **Priority, Status, Client & Device, Problem, Assigned Technician, Date.**           | All specified columns are present and display the correct data for each row.                                         |
| FR-3.3 | The "Status" column must support these values: **"New," "Assigned," "In Progress," "Completed," and "Cancelled."** | Status is displayed with distinct visual badges for each state.                                                      |
| FR-3.4 | Each row must have an **"[Assign]"** action button.                                                              | Clicking "Assign" presents a list of available technicians (employees with role "technician").                        |
| FR-3.5 | On assigning a technician, the ticket's status must change from "New" to "Assigned."                             | The row updates in real-time to reflect the new status and assigned technician name.                                 |
| FR-3.6 | Each row must have a **"[View Details]"** action button.                                                         | Clicking "View Details" opens the `TicketDetailsModal`.                                                              |
| FR-3.7 | The dashboard must support **filtering** by Priority and Status.                                                  | Filter controls are available and correctly narrow down the displayed rows.                                          |
| FR-3.8 | The dashboard must support **searching** by Client Name, Device Name, or Ticket ID.                              | A search bar is available and filters rows based on the search query.                                                |
| FR-3.9 | Each row must allow **inline priority change** via a dropdown or click action.                                    | Clicking the priority badge reveals options (Critical, High, Normal). Selecting one updates the ticket immediately.  |

### FR-4: Ticket Details Modal

| Req ID | Requirement                                                                                                     | Acceptance Criteria                                                                                                  |
|--------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| FR-4.1 | The modal must display all ticket information: Client, Device, Priority, Status, Problem Description, Call Notes, Receiver, Attachments, Date. | All fields are present and formatted for readability.                                                                |
| FR-4.2 | The modal must include a **"Technical History"** section tied to the specific device/contract of the ticket.     | The section shows a chronological list of past maintenance requests for that device.                                 |
| FR-4.3 | Each history entry must show: Visit Date, Visit Type, Technician Name, Resolution Status, and Problem Description. | Data is pulled from existing `MaintenanceRequest` records matching the ticket's `contractId`.                        |
| FR-4.4 | The Client's **Rating** (Committed/NotCommitted/Undefined) must be visually displayed in the ticket details.     | The rating is shown as a colored badge consistent with the client's profile page styling.                            |
| FR-4.5 | The modal must allow the manager to **change the ticket's priority** via a dropdown selector.                     | A priority dropdown is present, and selecting a new value persists the change immediately.                           |

---

## 4. Non-Functional Requirements

| Category        | Requirement                                                                                            |
|----------------|---------------------------------------------------------------------------------------------------------|
| **Performance** | The smart search must return results within 300ms of the user stopping typing.                          |
| **Usability**   | The full ticket creation flow (from FAB click to submission) must be completable in under 60 seconds.   |
| **Accessibility**| The FAB must have a descriptive accessible label for screen readers.                                    |
| **Data Integrity**| All ticket data must use real data from the application's existing stores (Clients, Contracts, Employees). No mock data. |

---

## 5. Key Entities

### 5.1 EmergencyTicket (New Entity)

| Field               | Type                                   | Required | Description                                           |
|----------------------|----------------------------------------|----------|-------------------------------------------------------|
| id                   | number                                 | Yes      | Unique ticket identifier (auto-generated)             |
| clientId             | number                                 | Yes      | Reference to the Client record                        |
| clientName           | string                                 | Yes      | Denormalized client name for display                  |
| clientAddress        | string                                 | Yes      | Denormalized client address                           |
| clientRating         | ClientRating                           | No       | Snapshot of client's rating at creation time           |
| contractId           | number or null                         | No       | Reference to a specific Contract/Device               |
| deviceModelName      | string or null                         | No       | Denormalized device model name                        |
| problemDescription   | string                                 | Yes      | Free-text description of the emergency                |
| callNotes            | string                                 | No       | Optional notes from the call                          |
| attachments          | string[]                               | No       | List of file references (URIs or base64)              |
| callReceiver         | string                                 | Yes      | Name of the user who created the ticket               |
| priority             | 'Critical' \| 'High' \| 'Normal'       | Yes      | Ticket priority (default: 'Normal')                   |
| status               | 'New' \| 'Assigned' \| 'In Progress' \| 'Completed' \| 'Cancelled' | Yes      | Ticket lifecycle status (default: 'New')              |
| assignedTechnicianId | number or null                         | No       | Reference to the assigned Employee (technician)       |
| createdAt            | string (ISO date)                      | Yes      | Timestamp of ticket creation                          |

### 5.2 Existing Entities Used (Read-Only)

| Entity               | Usage                                                            |
|-----------------------|------------------------------------------------------------------|
| **Client**            | Smart search source; provides name, address, rating, contacts    |
| **Contract**          | Device/contract dropdown; links ticket to a specific device      |
| **Employee**          | Technician assignment source (role = 'technician')               |
| **MaintenanceRequest**| Technical history; filtered by contractId to show past work      |

---

## 6. Scope & Boundaries

### In Scope

-   Global FAB with speed-dial menu in `MainLayout`.
-   `NewEmergencyTicketModal` for creating emergency tickets with smart search and auto-population.
-   `EmergencyTasks` dashboard page (replaces or redesigns the current `Emergency.tsx`) with data table, filtering, search, and assignment.
-   `TicketDetailsModal` with ticket info display and device-specific technical history.
-   New `EmergencyTicket` data entity and associated storage.

### Out of Scope

-   Real-time push notifications or WebSocket-based updates.
-   Technician-facing mobile view or acknowledgment workflow.
-   SMS/WhatsApp integration for notifying technicians.
-   Ticket resolution UI workflow (buttons/forms for transitioning tickets through In Progress → Completed/Cancelled) — statuses are defined in the data model but the transition UI is a follow-up feature.
-   Analytics or reporting on emergency ticket trends.
-   Role-based access control (all logged-in users can create tickets; all can view the dashboard).

---

## 7. Dependencies

| Dependency     | Description                                                                                   |
|---------------|-----------------------------------------------------------------------------------------------|
| Client Store   | Must be populated with real client data for smart search to function.                          |
| Contract Store | Must be populated with real contract data for device dropdown to function.                     |
| Employee Store | Must have employees with role 'technician' for assignment to function.                        |
| MainLayout     | The FAB will be added to the global layout component.                                         |

---

## 8. Assumptions

| ID   | Assumption                                                                                                                                  |
|------|---------------------------------------------------------------------------------------------------------------------------------------------|
| A-1  | The "currently logged-in user" is determined from the existing user context in MainLayout (currently "إبراهيم عبيد" / "مدير النظام").         |
| A-2  | The smart search matches on `client.name`, `client.firstName`, `client.lastName`, `client.nickname`, and primary contact number.             |
| A-3  | "Devices" for a client are derived from the Contract entity (where `contract.customerId === client.id`).                                    |
| A-4  | File attachments are stored as base64-encoded data URIs for local storage compatibility (no backend file server).                            |
| A-5  | The FAB is positioned in the bottom-left corner per RTL layout conventions (the app uses RTL direction).                                    |
| A-6  | The existing `Emergency.tsx` page will be **replaced** by the new `EmergencyTasks.tsx` dashboard (not kept alongside it).                   |
| A-7  | Default priority for new tickets is "Normal." Managers can change priority from both the dashboard (inline) and the Ticket Details Modal.  |
| A-8  | Technical history is loaded from `MaintenanceRequest` records where `contractId` matches the ticket's contract.                              |

---

## 9. Success Criteria

| Criterion | Metric                                                                                                  |
|-----------|----------------------------------------------------------------------------------------------------------|
| SC-1      | Any user can create a new emergency ticket from any page in the application in under 60 seconds.          |
| SC-2      | 100% of auto-populated fields (Client Name, Address, Rating, Devices) are correctly filled from real data. |
| SC-3      | The manager's dashboard displays all open emergency tickets with accurate status, priority, and assignment. |
| SC-4      | A manager can assign a technician to an unassigned ticket in under 3 clicks.                              |
| SC-5      | The Ticket Details modal correctly displays historical maintenance records for the specific device linked to the ticket. |
| SC-6      | The FAB is visible and functional on 100% of pages within the application.                                |
| SC-7      | Smart search returns matching results within 1 second of the user pausing input.                          |
