# Evidence and Authority Review

This extension preserves the existing dashboards, satellite map and light/dark themes.

## New Modules

- `backend/services/evidenceVerification.js`: Sharp image decoding, perceptual hashing, Gemini analysis, mandatory fresh GPS and explicit unassessed results.
- `backend/middleware/contractorAuth.js`: signed eight-hour JWTs, active accounts and server-side assignment checks.
- `backend/services/financialReconciliation.js`: successful linked payments across the full ledger; estimates are not treated as sanctioned budgets.
- `backend/routes/investigations.js`: persistent cases, reviewer assignment, revision checks and review history.
- `frontend/src/components/MPLADS/pages/Investigations.tsx`: authority queue, source works, payments, evidence and decisions.
- `frontend/src/utils/exportInvestigationPdf.tsx`: case PDFs including evidence, financial data, sources and limitations.

## Local Setup

Run `pnpm install` from `E:\clone\empowered-indian`.
Keep MongoDB, `JWT_SECRET` and `GEMINI_API_KEY` in `backend/.env`, never in React.
Optionally configure `GEMINI_VISION_MODEL` to a supported multimodal model.

### Vision Deployment Check

Vision uses actual uploaded image pixels through Google Gemini, not filename keywords or fixed scores. The contractor portal displays model identity, project relevance, model confidence, visible construction stage, visual observations and review signals separately from GPS and progress verification.

Set these backend environment variables in Render before deploying (never use `VITE_` for the API key):

```dotenv
GEMINI_API_KEY=<your server-side Gemini key>
GEMINI_VISION_MODEL=gemini-3.5-flash-lite
GEMINI_VISION_FALLBACK_MODELS=gemini-3.6-flash
```

Run `pnpm --dir backend vision:check` before pushing. It sends the bundled construction photograph and unrelated illustration to the real vision API, requires a positive and negative match respectively, and exits with an error if either cannot be assessed. It consumes API quota but does not write project or evidence data. Model confidence is self-reported, not a measured accuracy or fraud probability.

`GET /api/contractors/vision/status` reports configured models and the most recent in-process analysis status to authenticated contractors, without exposing keys. Missing credentials, quota exhaustion, safety blocks, truncated output and timeouts have explicit error codes. A missing/busy/invalid primary can use one of the configured fallbacks; credential and quota errors stop immediately. Each attempt times out after 20 seconds. Keep the fallback list short and run the live check with the same key used by your deployed backend. Local `.env` values do not automatically become Render environment variables.

An image can match the project while the overall evidence remains unassessed because exact site GPS or physical progress cannot be established. That is a separate check, not an absent vision model.

References: [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [generation configuration](https://ai.google.dev/api/generate-content#ThinkingConfig).
### Local Servers

Run in separate terminals:

```powershell
pnpm --dir backend start
pnpm --dir frontend dev -- --host 127.0.0.1
```

Open the Vite URL, normally `http://127.0.0.1:5173`.
Contractor portal: `/mplads/contractor-login`. Authority queue: `/mplads/investigations`.
Existing contractor demo accounts use `field123`; these are demonstration identities.
Old contractor sessions must sign in again because unsigned session hashes are rejected.

## Password-Locked Local Testing

The contractor portal includes **Password-locked testing**. Enter the configured testing password to unlock a 15-minute session. The server verifies its bcrypt hash in `FIELD_TEST_PASSWORD_HASH`; the plaintext password is not embedded in React or committed configuration. A blank hash disables this feature on other deployments.

Choose **Construction sample**, **Unrelated image test**, or **Simulate site GPS** with your own uploaded photo. You do not need to travel to the site. All results use the real verification pipeline, including actual vision-provider failures and image-reuse checks, rather than predetermined passing scores. Test GPS compares against an explicitly synthetic sandbox reference, even when the live work has only regional coordinates. The live work's coordinates and verification policy are unchanged. A single photograph may still leave physical progress unassessed; an unrelated or reused image remains flagged.

Test submissions carry explicit simulated-GPS markers and are stored only in `test_work_updates`. They do not change live work evidence, accepted progress, map markers, financial metrics or contractor scores. Locking, expiry or page reload clears test access and clears simulated form values. Never present sandbox output as genuine site verification.

Construction sample source: https://images.unsplash.com/photo-1504307651254-35680f356dfd (Unsplash context photograph, not the selected project site). The unrelated example is the existing contractor illustration.

## Authority Account Setup

Use an existing admin account or explicitly create one. There is no default authority password:

```powershell
$env:AUTHORITY_EMAIL = 'your-reviewer@example.org'
$secret = Read-Host 'New password, at least 12 characters' -AsSecureString
$env:AUTHORITY_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
pnpm --dir backend create-authority
Remove-Item Env:AUTHORITY_PASSWORD
```

Verify the backend database target before running this command. It hashes the password and refuses to overwrite existing accounts. Sign in at `/login`. Normal users and contractors cannot make authority decisions.

## Demonstration

1. Contractor signs in and selects an assigned work.
2. Upload a JPEG, PNG or WebP under 5 MB, capture device GPS and enter declared progress.
3. Backend analyzes actual pixels and recent perceptual fingerprints, then persists the evidence. Unrelated images are flagged; unavailable analysis cannot pass. Unverified submissions do not overwrite accepted progress.
4. Authority signs in and opens the map. Mark a source work verified or escalate it with a review note. Constituency clusters cannot be reviewed as individual works.
5. Open the investigation case, assign a reviewer, save a decision and export the PDF.
6. Reload to demonstrate persisted decisions and review history.

## API and Storage

Contractor JWT required: `GET /api/contractors/dashboard`, `GET /api/contractors/projects`, `GET /api/contractors/projects/:projectId/timeline`, `POST /api/contractors/projects/:projectId/updates`.

Authority required: `GET/POST /api/investigations`, `GET /api/investigations/reviewers`, `GET/PATCH /api/investigations/:caseId`.

Password-locked sandbox: `POST /api/contractors/testing/unlock`, `GET /api/contractors/testing/projects/:projectId/sample`, and `GET/POST /api/contractors/testing/projects/:projectId/updates`. These require the contractor session; sample and update endpoints additionally require the short-lived `X-Field-Test-Token`.

New collection: `investigation_cases`, with unique work reference, version and audit events.
Contractors gain bcrypt password hashes and live evidence score components. Work updates gain perceptual hashes, GPS capture timestamps, vision output and pipeline version 3. Index creation is automatic. No existing works or historical submissions are deleted or silently rescored.

## Checks

```powershell
pnpm --dir backend test
pnpm --dir frontend test
pnpm --dir frontend build
node backend/scripts/validateExecution.js
```

The opt-in integration script uses configured MongoDB and vision credentials. It writes only to random `qa_execution_<uuid>_*` collections, exercises the full flow, and drops only those test collections. It may consume vision quota; it never inserts QA evidence into real project collections.

## Limits

- Browser GPS and file timestamps can be spoofed; neither proves authentic capture. Regional coordinate fallbacks cannot verify an exact site.
- AI confidence is not proof of fraud, workmanship or exact completion. Provider failures and uncertainty require manual review.
- Perceptual matching covers the latest 2,000 processed images. Historical results are labeled legacy, not presented as revalidated.
- New verification supports photographs, not video. Old video metadata is preserved without claiming video analysis.
- Images are normalized and stored in MongoDB. Scaled production needs object storage, asynchronous workers and retention policies.
- Cases display 30 latest evidence submissions and 200 payments; reconciliation covers all linked ledger rows. PDF completeness counts disclose these limits. The queue returns the latest 200 cases.
- Contractor history remains demo data. The live verified-evidence component now reflects pipeline-v3 submissions; the hybrid score is not an official procurement rating.
- Replace/disable public demo credentials before a real authority deployment. This work does not deploy, push changes or rotate production secrets.
