# ArthaNetra

ArthaNetra is an MPLADS intelligence and project monitoring platform for tracking public funds, works, risk signals, project progress, constituency performance, and civic feedback.

The product combines a React dashboard, a Node/Express API, MongoDB-backed MPLADS data, AI-assisted risk analysis, GIS map views, weather-aware risk signals, Formspree reporting, and a general AI assistant.

## Features

- MPLADS command dashboard with allocation, expenditure, utilization, MP, state, and work metrics.
- Project discovery with filters for MPs, constituencies, states, categories, payments, and progress.
- AI Risk Intelligence Center using backend risk scoring with Gemini-assisted explanations.
- GIS Map page with Leaflet, India-focused markers, risk coloring, project details, weather signals, milestone funding, and evidence gallery.
- Contractor field portal for assigned works, GPS capture, evidence submission, verification scoring, and project timelines.
- Forced GPS-tagged contractor evidence with compressed image upload, video evidence reference capture, server timestamping, duplicate checks, and map/timeline updates.
- Contractor quality credit leaderboard using completion history, cost discipline, verified evidence rate, and review signals.
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
cd E:\clone\empowered-indian
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
ENABLE_CONSOLE_LOGS=true
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
cd E:\clone\empowered-indian
pnpm --dir backend dev
```

Backend runs at `http://127.0.0.1:8080`.

Terminal 2, frontend:

```powershell
cd E:\clone\empowered-indian
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
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/dashboard?contractorId=abc-infra -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/leaderboard -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/demo-accounts -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/field-monitoring -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/source-coverage -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/map-projects -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/projects/field-road-ward-5/shortlist -UseBasicParsing
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
- Contractors: `/mplads/contractors`
- Contractor Login: `/mplads/contractor-login`
- Contractor Field Portal: `/mplads/contractor-portal`
- Reports: `/mplads/report`
- Architecture: `/mplads/architecture`

## Contractor Intelligence Demo

The SIH demo flow is:

1. Open `/mplads/contractors` to show the authority-facing quality credit leaderboard.
2. Show `Live field monitoring` for evidence counts, review load, and map-status distribution.
3. Show `Performance shortlist` for a selected project. This explains why a contractor is a good fit without auto-awarding work.
4. Click `Contractor login`.
5. Sign in as `field@abcinfra.in` with password `field123`.
6. Select `Construction of Road - Ward 5`.
7. Upload a site image/video reference or use sample evidence.
8. Use browser `Capture GPS` or `Demo site GPS`; submission is blocked until GPS is present.
9. Submit the evidence update and show the verification pipeline.
10. Review the generated verification score, GPS result, image relevance signal, duplicate check, progress check, and project timeline/map evidence.

Demo contractor accounts:

```text
field@abcinfra.in       field123
site@dakshinbuild.in    field123
ops@easterncivic.in     field123
field@narmadacivil.in   field123
site@uttarpath.in       field123
```

The contractor module creates these MongoDB collections on first use:

```text
contractors
contractor_projects
work_updates
```

This is a working prototype loop backed by MongoDB. Assigned contractor work cards are generated from real `works_recommended` and `works_completed` MPLADS records where available, then connected to the contractor execution layer. GPS distance, map status derivation, duplicate evidence fingerprinting, progress scoring, timelines, contractor quality credit, and contractor-project match scoring are real backend calculations. Image verification currently uses a deterministic project-category heuristic so the demo still works without a multimodal API key; it is structured so a Gemini vision verifier can replace that heuristic later.

### Contractor Data Scope And Future Connectors

Official MPLADS data provides projects, MPs, constituencies, works, allocations, recommendations, and expenditure. It does not provide contractor login accounts, contractor passwords, daily site photos, exact worksite GPS for every record, or contractor performance histories. The contractor module therefore uses real MPLADS work records for assigned project context, seeded contractor profiles for the login/performance shell, and live MongoDB field submissions for the execution evidence layer.

Best aligned public/official contractor intelligence connectors for production:

- CPWD Contractor Enlistment: contractor class/category/eligibility signal for civil works.
- Government e-Marketplace and CPPP/eProcurement: tender participation, award, buyer, and procurement history signals.
- State PWD contractor registries: state-wise eligibility, regional experience, and category/license signal.
- Project field evidence generated by ArthaNetra: geo-tagged updates, verification scores, duplicate/reused evidence checks, and performance history.

Production media handling should move uploaded images/videos to object storage such as S3, Cloudinary, or Render disk-backed storage. The current demo compresses images in the browser and stores the evidence reference in MongoDB so the SIH flow works locally without extra infrastructure.

## PS 26102 Coverage Checklist

ArthaNetra currently covers the main expected solution areas:

| SIH requirement | Current implementation |
| --- | --- |
| Trends and fund utilization | Dashboard, state/MP summaries, allocation/expenditure/utilization metrics |
| Expenditure anomalies | AI Risk page, payment gap, utilization outliers, risk scoring |
| Delayed projects | Progress, expected progress, stale update, missed update, and timeline signals |
| Duplicate works | Text/geospatial duplicate indicators and duplicate evidence fingerprinting |
| Cost overruns / payment gaps | Expenditure vs completed work value, payment gap, contractor cost-discipline scoring |
| Alerts / early warning | Risk buckets, map colors, field monitoring review queue |
| Decision dashboards | Ministry dashboard, map, MP/state detail, contractors leaderboard |
| Contractor execution monitoring | Separate contractor login, assigned work cards, GPS evidence, media upload, verification score |
| Compliance language | Uses "requires review", "potential anomaly", and "decision support"; it does not accuse fraud automatically |

Readiness endpoint:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/api/contractors/source-coverage -UseBasicParsing
```

Use this during judging if asked what is official. It reports official MPLADS-backed contractor work cards, demo execution-layer projects, evidence submissions, GPS-verified submissions, image/video evidence counts, and coordinate fallbacks.

## Deployment Notes

Recommended deployment:

1. MongoDB Atlas for database.
2. Primary backend on Railway, Fly.io, DigitalOcean App Platform, or a small VPS/container host.
3. Render Web Service for `backend` as a fallback/demo mirror if desired.
4. Vercel, Render Static Site, or Netlify for `frontend`.

Deploy backend first, then frontend.

For SIH judging, use the stronger backend URL as `VITE_API_URL` and keep the Render API URL ready as a backup. The backend is the compute-heavy piece because AI risk analysis, map feed generation, contractor source coverage, and MongoDB aggregation can use more CPU/RAM than a small Render instance.

Backend Render settings:

```text
Root Directory: backend
Build Command: corepack enable && pnpm install
Start Command: pnpm start
```

Backend Docker settings for Railway/Fly.io/DigitalOcean:

```text
Dockerfile: backend/Dockerfile
Port: 8080
Health check: /health
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
