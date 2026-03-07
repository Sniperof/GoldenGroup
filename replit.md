# Golden CRM

A React-based CRM (Customer Relationship Management) application.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Maps**: Leaflet + React Leaflet
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Project Structure

```
src/
  App.tsx              - Main app component with routing
  main.tsx             - Entry point
  index.css            - Global styles
  components/          - Reusable UI components
  pages/               - Page-level components
    Dashboard.tsx
    Clients.tsx
    Employees.tsx
    DeviceManagement.tsx
    GeoSettings.tsx
    RouteManager.tsx
    SystemSettings.tsx
    TelemarketerWorkspace.tsx
    candidates/        - Candidate management pages
    contracts/         - Contract management pages
    planning/          - Planning/scheduling pages
    tasks/             - Task management pages
  hooks/               - Custom React hooks (Zustand stores)
  lib/                 - Utilities, types, mock data
  layout/              - Layout components
```

## Development

- Run: `npm run dev` (starts on port 5000)
- Build: `npm run build`

## Configuration

- Vite configured for host `0.0.0.0`, port `5000`, with `allowedHosts: 'all'` for Replit proxy compatibility
- Deployment: Static site via `npm run build` → `dist/` directory
