# ArthaNetra Frontend

React + Vite + TypeScript frontend for the ArthaNetra MPLADS intelligence platform.

## What It Contains

- Public home page and ArthaNetra branding.
- MPLADS dashboard, projects, states, MPs, compare, reports, and AI risk pages.
- Leaflet GIS map for constituency-level project and risk visualization.
- General AI assistant wired to active page context.
- Formspree-backed feedback and data issue forms.
- Responsive product UI for dashboard, tables, cards, filters, maps, and reports.

## Requirements

- Node.js 20+
- pnpm 10+

## Setup

From the repository root:

```powershell
cd E:\clone\empowered-indian
pnpm install
```

Start the frontend:

```powershell
pnpm --dir frontend dev -- --host 127.0.0.1 --port 5176
```

Open `http://127.0.0.1:5176`.

## Environment Variables

Local frontend configuration lives in `frontend/.env`.

```env
VITE_API_URL=http://127.0.0.1:8080/api
VITE_API_URL_DEVELOPMENT=http://127.0.0.1:8080/api
VITE_ENABLE_ANALYTICS=false
VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/your_feedback_form
VITE_FORMSPREE_FEEDBACK_ENDPOINT=https://formspree.io/f/your_feedback_form
VITE_FORMSPREE_DATA_ISSUE_ENDPOINT=https://formspree.io/f/your_data_issue_form
```

Do not put Gemini, MongoDB, SMTP, JWT, or Pexels secrets in the frontend. `VITE_*` variables are public after build.

Restart Vite after changing `.env`.

## Scripts

```powershell
pnpm --dir frontend dev
pnpm --dir frontend build
pnpm --dir frontend build:dev
pnpm --dir frontend preview
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend smoke
pnpm --dir frontend sitemap
```

## Important Routes

- `/`
- `/mplads`
- `/mplads/track-area`
- `/mplads/map`
- `/mplads/states`
- `/mplads/mps`
- `/mplads/compare`
- `/mplads/risk-analysis`
- `/mplads/report`
- `/mplads/architecture`

## Deployment

For Render Static Site:

```text
Root Directory: frontend
Build Command: corepack enable && pnpm install && pnpm build
Publish Directory: dist
```

Set production env:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_API_URL_PRODUCTION=https://your-backend.onrender.com/api
SITEMAP_SITE_URL=https://your-frontend.onrender.com
SITEMAP_API_URL=https://your-backend.onrender.com/api
VITE_ENABLE_ANALYTICS=false
```

## Notes

- The map uses Leaflet tiles and API data. If exact latitude/longitude is not present, location is handled by frontend fallback logic and marked as constituency-level context.
- Reports use Formspree when configured and can fall back to backend feedback APIs where available.
- Analytics is env-controlled and disabled locally by default.

## License

AGPL-3.0. See the root [LICENSE](../LICENSE).
