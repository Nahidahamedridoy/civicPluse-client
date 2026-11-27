# CivicPulse – Smart City Infrastructure Management Platform (Frontend)

**Repository:** `civicpulse-client`

CivicPulse is a GovTech platform that enables citizens to report city‑infrastructure issues and lets municipal staff manage, assign, and resolve them. This repository contains the **frontend** built with Next.js 16, TypeScript, Tailwind CSS, HeroUI, Recharts, React‑Leaflet and Lucide React.

---

## Table of Contents
- [Project Overview & Objectives](#project-overview--objectives)
- [Features & User Roles](#features--user-roles)
- [Technology Stack](#technology-stack)
- [Frontend Architecture & Folder Structure](#frontend-architecture--folder-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Local Development Commands](#local-development-commands)
- [Backend API Integration](#backend-api-integration)
- [Authentication & Role‑Based Access](#authentication--role‑based-access)
- [Issue Reporting Workflow](#issue-reporting-workflow)
- [Dashboard & Analytics](#dashboard--analytics)
- [Map & GPS Features](#map--gps-features)
- [Demo Login Credentials](#demo-login-credentials)
- [Deployment Instructions](#deployment-instructions)
- [Screenshots (Placeholders)](#screenshots-placeholders)
- [Future Improvements](#future-improvements)
- [Author & License](#author--license)

---

## Project Overview & Objectives
- **Goal:** Provide a modern, responsive web portal for reporting, tracking, assigning, and managing city infrastructure issues.
- **Primary Users:** Citizens, Admins, Department Managers, Maintenance Staff.
- **Objectives:**
  - Deliver a fast, SEO‑friendly SPA using Next.js App Router.
  - Implement role‑based UI that hides unavailable actions.
  - Show real‑time updates via Socket.IO.
  - Visualise data with Recharts and map issue locations with React‑Leaflet.
  - Keep the UI consistent across light and dark themes.

---

## Features & User Roles
### Core Features
- Responsive layout (mobile‑first, tablet, desktop).
- JWT authentication with HttpOnly cookie.
- Role‑based navigation and route protection.
- Issue CRUD with image upload (via backend ImgBB integration).
- Real‑time issue assignment and status updates (Socket.IO).
- Analytics dashboards with charts for total issues, department performance, and staff KPIs.
- Interactive map displaying issue markers and clustering.
- Dark/Light theme toggle.
- Consistent Lucide icons throughout the UI.

### User Roles
| Role | Capabilities (frontend) |
|------|--------------------------|
| **Admin** | Full access to admin panel (`/admin/*`), manage users, departments, all issues, view analytics. |
| **Department Manager** | Manage own department, view departmental analytics, assign issues within the department. |
| **Maintenance Staff** | View assigned tasks (`/staff/dashboard`), update progress, upload completion photos. |
| **Citizen** | Report new issues, view personal reports, browse issue categories, see map of reported problems. |

---

## Technology Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (layer engine)
- **Component Library:** HeroUI (`@heroui/react`)
- **Charts:** Recharts
- **Maps:** React‑Leaflet
- **Icons:** Lucide React
- **State & Data:** React Context (`AuthContext`), `fetch` API
- **Realtime:** Socket.IO client (`socket.io-client`)
- **Build Tool:** pnpm (recommended)

---

## Frontend Architecture & Folder Structure
```
src/
├─ app/                     # Next.js App Router pages
│   ├─ admin/               # Admin UI (dashboard, issues, departments, users, analytics)
│   ├─ citizen/             # Citizen UI (dashboard, report‑issue, my‑reports)
│   ├─ manager/             # Department manager UI (subset of admin)
│   ├─ staff/               # Maintenance staff dashboard
│   └─ layout/              # Navbar, Footer, ThemeToggle, AppShell
├─ components/              # Re‑usable UI components (modals, charts, maps, tables)
├─ context/                 # AuthContext and related hooks
├─ lib/                     # API wrapper (`admin-api.ts` etc.)
├─ utils/                   # Helper functions (date formatting, etc.)
└─ styles/
    └─ globals.css
```
All routes used in this README are present in the `src/app` directory (e.g., `src/app/admin/dashboard/page.tsx`, `src/app/admin/issues/page.tsx`).

---

## Installation & Setup
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-org/civicpulse-client.git
cd civicpulse-client

# 2️⃣ Install dependencies (pnpm is preferred)
pm install -g pnpm   # if pnpm is not installed
pnpm install
```
> **Note:** The installation runs inside the sandbox, which has full file‑system access.

---

## Environment Variables
Create a `.env.local` file at the project root (do **not** commit it). Use the following placeholders:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api   # Base URL of the backend API
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token      # Optional, if you replace OSM tiles
NEXT_PUBLIC_IMGBB_API_KEY=your-imgbb-key        # Used only by the backend; client forwards files
```
All secrets are kept on the backend; the frontend only needs the API URL.

---

## Local Development Commands
```bash
# Development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start the built app (requires `pnpm build` first)
pnpm start
```
The dev server proxies API calls to `http://localhost:5000/api` as defined by `NEXT_PUBLIC_API_URL`.

---

## Backend API Integration
The frontend communicates with the sibling repository **civicpulse‑server**. All API calls are built around the routes defined in `civicpulse-server/src/routes`. Key endpoints used:
- `POST /api/auth/register` – citizen registration (role forced to `citizen`).
- `POST /api/auth/login` – returns JWT in HttpOnly cookie.
- `GET /api/users/profile` – fetch current user profile.
- `GET /api/departments` – list departments (active only for non‑admin).
- `GET /api/issues` – list/filter issues.
- `POST /api/issues` – citizen creates a new issue (multipart, up to 5 images).
- `GET /api/issues/:id` – issue details.
- `PATCH /api/issues/:id/assign` – admin/manager assigns staff.
- `PATCH /api/issues/:id/status` – change status.
- `GET /api/analytics` – dashboard totals.
- `GET /api/analytics/department‑performance` – department KPI data.
- `GET /api/analytics/staff‑performance` – staff KPI data.
- `GET /api/map/issues` – GeoJSON for the Leaflet map.

All routes are imported in `civicpulse-server/src/routes/*.js`; the frontend never calls non‑existent endpoints.

---

## Authentication & Role‑Based Access
1. **Login** – The login form sends `POST ${NEXT_PUBLIC_API_URL}/auth/login`. On success the server sets an `authToken` cookie.
2. **AuthContext** reads the cookie, decodes the JWT and provides:
   - `user` (id, name, email, role, department)
   - `isAuthenticated`
   - `logout()` – clears the cookie.
3. **Protected UI** – Components guard themselves with `isAuthenticated && user.role === 'admin'` (or other roles). The `Navbar` only shows links the current role can access.
4. **Route Protection** – Pages use `middleware/auth` on the server side (Next.js) to redirect unauthenticated users.

---

## Issue Reporting Workflow
1. Citizen clicks **Report Issue** → opens `IssueModal`.
2. Form fields: title, description, category (from static list), location (address + map picker), optional images.
3. On submit, the modal sends a `multipart/form-data` `POST /api/issues` request.
4. Backend stores the issue, uploads images to ImgBB, returns the created issue ID.
5. Admins / Department Managers can view the new issue, verify it, assign staff, and update its status via the respective PATCH endpoints.
6. Assigned maintenance staff receive a real‑time `issue-assigned` Socket.IO event and can update progress reports (`POST /api/issues/:id/progress‑reports`).

---

## Dashboard & Analytics
- **Admin Dashboard** (`/admin/dashboard`) displays:
  - Total issues, pending, resolved.
  - Department workload overview.
  - Staff performance KPIs.
- Charts are built with **Recharts** (line, bar, pie). Data fetched from the analytics routes.
- The dashboard respects the current theme and is fully responsive.

---

## Map & GPS Features
- Implemented with **React‑Leaflet** in `src/components/map/IssueMap.tsx`.
- Issues with latitude/longitude are plotted; clustering groups nearby markers.
- Clicking a marker opens a popup with a brief issue summary and a link to its detail page.
- The map data is retrieved from `GET /api/map/issues`.

---

## Demo Login Credentials *(test accounts only)*
| Role | Email | Password |
|------|-------|----------|
| **Admin** | [admin@gmail.com](mailto:admin@gmail.com) | `Admin@123456` |
| **Department Manager** | [manager@gmail.com](mailto:manager@gmail.com) | `Manager@123456` |
| **Maintenance Staff** | [staff@gmail.com](mailto:staff@gmail.com) | `Staff@123456` |
| **Citizen** | [citizen@gmail.com](mailto:citizen@gmail.com) | `Citizen@123456` |
> **Important:** These credentials are for local development only. Change passwords before any production deployment.

---

## Deployment Instructions
1. **Build the app**: `pnpm build` (creates the `.next` folder).
2. **Choose a host** that supports Node.js (Vercel, Netlify, Railway, Render, etc.).
3. **Set environment variables** on the host exactly as in `.env.local` (especially `NEXT_PUBLIC_API_URL`).
4. **Deploy** – most platforms automatically run `npm start` (or `pnpm start`) to serve the built app.
5. **CORS** – ensure the backend’s `CORS_ORIGIN` matches the deployed front‑end URL.

---

## Screenshots (Placeholders)
```
[Home page – hero section](/docs/screenshots/home.png)
[Citizen dashboard – map view](/docs/screenshots/citizen-dashboard.png)
[Admin dashboard – analytics](/docs/screenshots/admin-analytics.png)
[Issue modal – image upload](/docs/screenshots/issue-modal.png)
[Footer – responsive layout](/docs/screenshots/footer.png)
```
Replace the placeholder paths with actual images when finalising the repository.

---

## Future Improvements
- Server‑Side Rendering for public pages (SEO). 
- Internationalisation (i18n) for multilingual cities.
- Push notifications via the Web‑Push API.
- Rate limiting and refresh‑token flow for improved security.
- GraphQL endpoint for more flexible data fetching.
- Background processing of image uploads (e.g., queue workers).

---

## Author & License
**Author:** Your Name – GitHub [@your‑github‑handle]

**License:** MIT – see the `LICENSE` file in the repository.

---
