# ArthaNetra

ArthaNetra is an MPLADS intelligence and project monitoring platform for tracking public funds, works, risk signals, project progress, constituency performance, and civic feedback.

The product combines a React dashboard, a Node/Express API, MongoDB-backed MPLADS data, AI-assisted risk analysis, GIS map views, weather-aware risk signals, Formspree reporting, and a general AI assistant.

## Features

- MPLADS command dashboard with allocation, expenditure, utilization, MP, state, and work metrics.
- Project discovery with filters for MPs, constituencies, states, categories, payments, and progress.
- AI Risk Intelligence Center using backend risk scoring with Gemini-assisted explanations.
- GIS Map page with Leaflet, India-focused markers, risk coloring, project details, weather signals, milestone funding, and evidence gallery.
- Compare page for MP and constituency performance.
- State and MP detail pages with analytical summaries.
- Reports section for feedback and data issue intake through Formspree or backend MongoDB fallback.
- General AI assistant that answers from active page context and live dashboard data.
- Responsive ArthaNetra UI with a modern civic-tech identity.

## Tech Stack

- Frontend: React, Vite, TypeScript, React Router, ECharts, Leaflet, React Query
- Backend: Node.js, Express, MongoDB, JWT, Helmet, CORS, rate limiting
- Database: MongoDB local, Docker, or Atlas
- External services: Gemini API, Open-Meteo weather, optional Pexels image search, Formspree

## Project Structure

```text
backend/          Express API, routes, services, MongoDB access
frontend/         React + Vite application
packages/         Shared workspace packages
upload-scripts/   Data upload and extraction helpers
docker-compose.yml
pnpm-workspace.yaml
```

## Prerequisites

- Node.js 20+ recommended
- pnpm 10+
- Docker Desktop, if using local MongoDB through Docker
- MongoDB Atlas, if deploying

Enable pnpm through Corepack if needed:

```powershell
corepack enable
```

## Local Setup

Install dependencies from the project root:

```powershell
cd E:\ArthaNetra
pnpm install
```

Start MongoDB locally:

```powershell
docker-compose up -d
```

This starts:

- MongoDB: `localhost:27017`
- Mongo Express: `http://localhost:8081`

## Environment Files

Create local env files:

```powershell
Copy-Item backend\.env.example backend\.env
```

The frontend `.env` contains local development defaults. Keep real secrets out of Git.

Important backend variables:

```env
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://admin:adminpassword@localhost:27017/mplads?authSource=admin
DATABASE_NAME=mplads
JWT_SECRET=replace_with_a_long_secret
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://127.0.0.1:5176,http://localhost:5176
FRONTEND_URL=http://127.0.0.1:5176
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.6-flash
PEXELS_API_KEY=optional_pexels_key
```

Important frontend variables:

```env
VITE_API_URL=http://127.0.0.1:8080/api
VITE_API_URL_DEVELOPMENT=http://127.0.0.1:8080/api
VITE_ENABLE_ANALYTICS=false
VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/your_feedback_form
VITE_FORMSPREE_FEEDBACK_ENDPOINT=https://formspree.io/f/your_feedback_form
VITE_FORMSPREE_DATA_ISSUE_ENDPOINT=https://formspree.io/f/your_data_issue_form
```

Restart the frontend after changing `frontend/.env`.

## Start Development Servers

Terminal 1, backend:

```powershell
cd E:\ArthaNetra
pnpm --dir backend dev
```

Backend runs at `http://127.0.0.1:8080`.

Terminal 2, frontend:

```powershell
cd E:\ArthaNetra
pnpm --dir frontend dev -- --host 127.0.0.1 --port 5176
```

Frontend runs at `http://127.0.0.1:5176`.

## Useful Checks

Frontend:

```powershell
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend smoke
```

Backend:

```powershell
pnpm --dir backend lint
```

API checks:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/api -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/summary/overview -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/ai/risk-analysis -UseBasicParsing
```

## Key Routes

- Home: `/`
- Dashboard: `/mplads`
- Projects: `/mplads/track-area`
- Map: `/mplads/map`
- States: `/mplads/states`
- MPs: `/mplads/mps`
- Compare: `/mplads/compare`
- AI Risk: `/mplads/risk-analysis`
- Reports: `/mplads/report`
- Architecture: `/mplads/architecture`

## Deployment Notes

Recommended deployment:

1. MongoDB Atlas for database.
2. Render Web Service for `backend`.
3. Render Static Site for `frontend`.

Deploy backend first, then frontend.

Backend Render settings:

```text
Root Directory: backend
Build Command: corepack enable && pnpm install
Start Command: pnpm start
```

Frontend Render settings:

```text
Root Directory: frontend
Build Command: corepack enable && pnpm install && pnpm build
Publish Directory: dist
```

Production frontend env:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_API_URL_PRODUCTION=https://your-backend.onrender.com/api
SITEMAP_SITE_URL=https://your-frontend.onrender.com
SITEMAP_API_URL=https://your-backend.onrender.com/api
```

Production backend CORS:

```env
CORS_ORIGINS=https://your-frontend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com
```

## Security

- Do not commit `.env` files with real secrets.
- Keep Gemini, MongoDB, JWT, SMTP, and Pexels keys server-side.
- Frontend `VITE_*` values are public after build.
- Rotate any secret that was ever committed accidentally.

## License

AGPL-3.0. See [LICENSE](./LICENSE).
