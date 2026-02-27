# Research Notes: Emergency Triage & Dispatch

**Date:** 2026-02-28

## Decision 1: State Management Pattern

- **Decision:** Use Zustand store (same as `useClientStore.ts`)
- **Rationale:** The project already uses Zustand for client state via `useClientStore`. Creating a `useEmergencyStore` follows the same pattern: initial load from `StorageManager`, actions that update state + persist to localStorage.
- **Alternatives:** React Context (heavier boilerplate), Redux (not used in project), useState per component (no cross-component sharing).

## Decision 2: Data Persistence

- **Decision:** Use `StorageManager.save('emergencyTickets', tickets)` with localStorage
- **Rationale:** All existing entities (clients, contracts, maintenance requests) use `StorageManager` with the `goldenCRM_` prefix and JSON serialization. No backend/API exists.
- **Alternatives:** IndexedDB (overkill for this volume), in-memory only (no persistence).

## Decision 3: Client Smart Search Implementation

- **Decision:** Reuse and adapt the existing `searchUtils.ts` fuzzy search pattern
- **Rationale:** `searchUtils.ts` already has `calculateSimilarity()` (Levenshtein-based) and `performSmartSearch()`. The emergency ticket modal needs a simpler version: search clients by name/nickname/phone with substring + fuzzy matching. A debounced (300ms) input that filters `useClientStore.clients` in-memory.
- **Alternatives:** Build from scratch (duplicates existing logic), external library (unnecessary overhead).

## Decision 4: Contracts Retrieval Strategy

- **Decision:** Load contracts from `StorageManager.load('contracts', [])` and filter by `customerId`
- **Rationale:** Contracts are stored under the `'contracts'` key. The `Contract` interface has `customerId`, `deviceModelName`, `serialNumber`, and `contractNumber` fields. No dedicated Zustand store exists for contracts; they are loaded inline where needed (same pattern as `Emergency.tsx` loading `maintenanceRequests`).
- **Alternatives:** Create a dedicated contracts store (possible future enhancement).

## Decision 5: Component Architecture

- **Decision:** 4 new components + 1 modified component
- **Rationale:** Clear separation of concerns per the spec:
  - `FloatingActionButton.tsx` — Global FAB in MainLayout
  - `NewEmergencyTicketModal.tsx` — Creation-only form
  - `EmergencyTasks.tsx` — Replaces existing `Emergency.tsx` dashboard
  - `TicketDetailsModal.tsx` — Detail view with history
  - `MainLayout.tsx` — Modified to include FAB
- **Alternatives:** Monolithic page component (violates separation of concerns), inline modals in MainLayout (bloats layout).

## Decision 6: Routing

- **Decision:** Keep the same route `/tasks/emergency` — just swap the component from `Emergency` to `EmergencyTasks`
- **Rationale:** The sidebar nav already points to `/tasks/emergency`. The old `Emergency.tsx` will be replaced, so no route change is needed. Only the import in `App.tsx` changes.
- **Alternatives:** New route path (unnecessary, breaks existing navigation).

## Decision 7: File Attachments

- **Decision:** Store as base64 data URIs in the ticket entity
- **Rationale:** Per Assumption A-4 in the spec, there is no backend file server. Base64 encoding works with localStorage. Accept image files only (`.jpg`, `.png`, `.webp`) with a 2MB size limit per file and max 3 attachments per ticket to avoid exceeding localStorage quota.
- **Alternatives:** Blob URLs (lost on page refresh), separate IndexedDB store (adds complexity).

## Decision 8: Auto-fill Current User

- **Decision:** Hardcode from the existing user context in MainLayout (currently "إبراهيم عبيد")
- **Rationale:** Per Assumption A-1. The app has no auth system; the user profile is currently hardcoded in MainLayout. A simple export const or passed prop suffices.
- **Alternatives:** Create a user context provider (good practice but out of scope for this feature).
