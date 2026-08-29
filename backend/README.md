# ArthaNetra Backend API

Node.js + Express + MongoDB API for the ArthaNetra MPLADS intelligence platform.

## What It Powers

- MPLADS dashboard summaries and metadata.
- Project, MP, state, constituency, payment, and report APIs.
- AI-assisted risk analysis at `GET /api/ai/risk-analysis`.
- General AI assistant context endpoints.
- Weather-aware project signals through Open-Meteo.
- Optional project image search through Pexels.
- Feedback and data issue persistence when frontend forms use backend fallback.

## Requirements

- Node.js 18+ minimum
- pnpm 10+
- MongoDB through Docker, local install, or Atlas

## Local Setup

Start MongoDB from the project root:

```powershell
cd E:\clone\empowered-indian
docker-compose up -d
```

Install dependencies and run the API:

```powershell
pnpm install
pnpm --dir backend dev
```

The API runs at `http://127.0.0.1:8080`.

## Environment Variables

Copy the template:

```powershell
Copy-Item backend\.env.example backend\.env
```

Key variables:

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
EMAIL_SERVICE=gmail
EMAIL_USER=optional_email_account
EMAIL_APP_PASSWORD=optional_app_password
EMAIL_FROM_NAME=ArthaNetra
```

Weather does not need an API key when using Open-Meteo.

## Scripts

```powershell
pnpm --dir backend dev
pnpm --dir backend start
pnpm --dir backend lint
pnpm --dir backend create-indexes
pnpm --dir backend analyze-performance
```

## API Checks

```powershell
Invoke-WebRequest http://127.0.0.1:8080/api -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/summary/overview -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8080/api/ai/risk-analysis -UseBasicParsing
```

## Deployment

For Render Web Service:

```text
Root Directory: backend
Build Command: corepack enable && pnpm install
Start Command: pnpm start
```

Use MongoDB Atlas in production and set:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mplads
DATABASE_NAME=mplads
CORS_ORIGINS=https://your-frontend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com
JWT_SECRET=your_long_random_secret
GEMINI_API_KEY=your_gemini_key
```

## Security

- Never commit `.env` files or real secrets.
- Keep AI, database, JWT, SMTP, and image provider keys on the backend.
- Use exact production origins in `CORS_ORIGINS`.
- Rotate any credential that was ever committed or shared publicly.

## License

AGPL-3.0. See the root [LICENSE](../LICENSE).
