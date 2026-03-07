# Golden CRM

An Arabic-language React-based CRM (Customer Relationship Management) application with a PostgreSQL backend.

## Tech Stack

- **Frontend**: React 18 with TypeScript, Vite 6
- **Backend**: Express 5 (TypeScript), PostgreSQL
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Maps**: Leaflet + React Leaflet
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Architecture

```
Frontend (Vite, port 5000) ──proxy /api──> Backend (Express, port 3000)
                                                │
                                           PostgreSQL
```

- **Development**: Vite dev server on port 5000 proxies `/api/*` requests to Express on port 3000. Both are started via `tsx server/start.ts`.
- **Production**: Express on port 5000 serves both the API and the built static frontend from `dist/`.

## Project Structure

```
server/
  index.ts              - Express server entry point (API + static serving)
  start.ts              - Dev startup script (starts backend then Vite)
  db.ts                 - PostgreSQL connection pool
  schema.ts             - Database schema creation + seed data
  routes/               - 15 REST API route modules
    geoUnits.ts, employees.ts, clients.ts, candidates.ts,
    referralSheets.ts, routes.ts, tasks.ts, contracts.ts,
    dues.ts, deviceModels.ts, spareParts.ts, maintenanceRequests.ts,
    visits.ts, schedules.ts, routeAssignments.ts, dashboard.ts

src/
  App.tsx               - Main app with routing
  main.tsx              - Entry point
  index.css             - Global styles
  lib/
    api.ts              - Frontend API client (fetch-based, relative /api base)
    types.ts            - TypeScript type definitions
  components/           - Reusable UI components
  pages/                - Page-level components
    Dashboard.tsx, Clients.tsx, Employees.tsx, DeviceManagement.tsx,
    GeoSettings.tsx, RouteManager.tsx, SystemSettings.tsx,
    TelemarketerWorkspace.tsx
    candidates/         - Candidate management pages
    contracts/          - Contract management pages
    planning/           - Planning/scheduling pages
    tasks/              - Task management pages
  hooks/                - Zustand stores (useCandidateStore, useCollectionStore)
  layout/               - Layout components
```

## Database

14 tables: `geo_units`, `employees`, `clients`, `candidates`, `referral_sheets`, `routes`, `route_points`, `tasks`, `device_models`, `spare_parts`, `contracts`, `dues`, `maintenance_requests`, `visits`, `day_schedules`, `route_assignments`

Schema is auto-created and seeded on first server start via `server/schema.ts`.

## Development

- Run: `npm run dev` (starts both servers via `tsx server/start.ts`)
- Build: `npm run build`
- Backend only: `npm run dev:server`
- Frontend only: `npm run dev:client`

## Configuration Notes

- Vite: `allowedHosts: true` (boolean, NOT string `'all'` — required for Vite 6)
- Vite watch ignores: `.local/**`, `.cache/**`, `.git/**`, `server/**`
- Express v5 catch-all route syntax: `/{*path}` (not `*`)
- Backend listens on `0.0.0.0` to accept proxy connections
- `npm install` requires `--legacy-peer-deps` due to react-leaflet peer dependency conflict
- Deployment: Autoscale, `npx tsx server/index.ts` with `PORT=5000`
