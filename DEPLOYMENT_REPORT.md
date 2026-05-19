# PM App — Deployment Report

Generated: 2026-05-19

---

## What Was Checked

### Backend
- TypeScript compilation (`npm run build`) — passed, zero errors
- Prisma schema validation (`npx prisma validate`) — valid
- Prisma client generation (`npx prisma generate`) — success
- All route files for broken imports — all clean
- Auth middleware (JWT verify + DB user lookup) — correct
- CORS configuration — updated
- Health endpoint — present, updated
- File upload (Multer) — memory storage, 5MB limit, correct
- Import/export controllers — no issues
- Gantt service — handles tickets without dates safely
- Error handlers — return clean JSON
- Environment variable usage — no hardcoded secrets

### Frontend
- TypeScript compilation (`tsc`) — fixed one error, now passes
- Vite production build — success (499KB bundle)
- API base URL — updated to use `VITE_API_URL` env variable
- Auth token handling — stored in localStorage, cleared on 401
- Protected routes — implemented with role check
- All page imports in `App.tsx` — all present and correct
- Gantt page — handles missing dates gracefully (shows them in a separate table)
- Import modals — present for both projects and tickets

---

## What Was Fixed

### 1. Frontend TypeScript error — `import.meta.env` not recognized

**File:** `frontend/tsconfig.json`

**Problem:** `Property 'env' does not exist on type 'ImportMeta'` — the Vite client types were not included.

**Fix:** Added `"types": ["vite/client"]` to `compilerOptions`.

---

### 2. Frontend API base URL — hardcoded to `/api` only

**File:** `frontend/src/services/api.ts`

**Problem:** `baseURL: '/api'` only works with Vite's dev proxy. In production (Vercel), there is no proxy, so API calls would fail.

**Fix:** Updated to `baseURL: import.meta.env.VITE_API_URL || '/api'`.

- Development: `VITE_API_URL` unset → falls back to `/api` (proxied by Vite to localhost:5000)
- Production: `VITE_API_URL=https://your-backend.onrender.com/api`

---

### 3. Backend health endpoint — missing `environment` field

**File:** `backend/src/index.ts`

**Problem:** Health endpoint returned `{ status, timestamp }` only.

**Fix:** Added `environment: NODE_ENV` to the response.

---

### 4. Backend CORS — used `CLIENT_URL`, renamed to `FRONTEND_URL`

**File:** `backend/src/index.ts`

**Problem:** The env variable was named `CLIENT_URL` which is ambiguous. Updated to `FRONTEND_URL` (standard naming). Code falls back to `CLIENT_URL` for backward compatibility during migration.

---

### 5. Backend `prisma:migrate` script — used `migrate dev` (dev only)

**File:** `backend/package.json`

**Problem:** `prisma migrate dev` is for local development only. It prompts interactively and is not suitable for production CI/CD.

**Fix:** Changed `prisma:migrate` to use `prisma migrate deploy` (non-interactive, safe for production). Added `prisma:migrate:dev` for local development use.

---

### 6. Backend body size limit — not explicit

**File:** `backend/src/index.ts`

**Fix:** Added `{ limit: '5mb' }` to `express.json()` and `express.urlencoded()` to match the file upload limit and prevent oversized payloads.

---

### 7. Backend morgan logging — always used `dev` format

**File:** `backend/src/index.ts`

**Fix:** Uses `combined` format in production (standard Apache format, compatible with log aggregation tools) and `dev` format in development.

---

### 8. Backend `.env.example` — updated

**File:** `backend/.env.example`

Updated to use `FRONTEND_URL` (aligned with the code change) and clarified placeholder values.

---

### 9. Frontend `.env.example` — missing

**File:** `frontend/.env.example` (new file)

Created with `VITE_API_URL="http://localhost:5000/api"` so developers know what to set for production.

---

### 10. Root `.gitignore` — missing

**File:** `.gitignore` (new file)

Added root-level `.gitignore` to prevent `node_modules`, `dist`, `.env`, and log files from being committed.

---

## How to Run Locally

```bash
# 1. Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure backend environment
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secret

# 3. Set up database
npx prisma migrate dev --name init
npx prisma generate
npm run seed

# 4. Start backend (in one terminal)
npm run dev

# 5. Start frontend (in another terminal)
cd ../frontend
npm run dev
```

Open `http://localhost:5173` and log in with `admin@pmapp.com` / `password123`.

---

## How to Deploy

### Database

Create a free PostgreSQL database at [Neon](https://neon.tech) or [Supabase](https://supabase.com).
Copy the connection string.

### Backend — Render

1. Connect your GitHub repo to Render
2. Create a new **Web Service**
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build && npx prisma generate`
   - **Start Command:** `npm run prisma:migrate && npm run start`
4. Add environment variables:
   ```
   DATABASE_URL=your-postgres-connection-string
   JWT_SECRET=your-random-secret-key
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
5. Deploy and note the URL: `https://your-app.onrender.com`
6. Test: `GET https://your-app.onrender.com/api/health`

### Frontend — Vercel

1. Connect your GitHub repo to Vercel
2. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-app.onrender.com/api
   ```
4. Deploy

---

## Required Environment Variables

### Backend (Render)

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | From Neon/Supabase/Railway |
| `JWT_SECRET` | `k8j2...` (32+ chars) | Use a random string |
| `JWT_EXPIRES_IN` | `7d` | |
| `NODE_ENV` | `production` | |
| `PORT` | `5000` | Render sets this automatically |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel URL |

### Frontend (Vercel)

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_API_URL` | `https://your-app.onrender.com/api` | Your Render URL + `/api` |

---

## Known Limitations

1. **File uploads are in-memory** — Multer uses `memoryStorage()`. For large files this is fine at 5MB, but if you need to serve uploaded files (e.g., avatars), you will need S3 or Cloudinary.

2. **Render free tier spins down** — The free Render plan suspends the backend after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. Upgrade to a paid plan or use Railway for always-on.

3. **No email notifications** — There is no email service integrated. Profile change requests, ticket assignments, and comments do not send emails.

4. **Single-tenant** — The app is not multi-tenant. All users share the same database.

5. **No rate limiting** — The API does not implement rate limiting. Consider adding `express-rate-limit` before exposing to the public internet.

---

## Recommended Hosting Option

| Stack | Cost | Notes |
|-------|------|-------|
| Neon (DB) + Render (backend) + Vercel (frontend) | Free | Best free option; Render free tier sleeps |
| Railway (all-in-one) | ~$5/mo | Easiest setup, always-on |
| Supabase (DB) + Render (backend) + Vercel (frontend) | Free | Supabase includes auth tools you may not need |

**Recommended:** **Neon + Render + Vercel** for zero cost, or **Railway** for simplicity.

---

## Final Testing Checklist

After deploying, verify the following:

### Authentication
- [ ] Login with `admin@pmapp.com` / `password123`
- [ ] Register a new user
- [ ] Logout and confirm redirect to `/login`
- [ ] Direct access to `/dashboard` without login redirects to `/login`

### Projects
- [ ] Create a new project
- [ ] Edit a project name/description
- [ ] Archive a project (status → ARCHIVED)
- [ ] Add a member to a project
- [ ] Remove a member from a project
- [ ] Export projects to Excel

### Project Import
- [ ] Download the CSV template
- [ ] Upload the template and see the preview
- [ ] Import valid rows
- [ ] Upload a file with invalid rows — confirm they are skipped, valid rows imported

### Tickets
- [ ] Create a ticket inside a project
- [ ] Edit ticket title, description, priority
- [ ] Assign a user to a ticket
- [ ] Change ticket status
- [ ] Add a comment
- [ ] Edit own comment
- [ ] Delete own comment
- [ ] Export tickets to Excel

### Ticket Import
- [ ] Download the ticket CSV template
- [ ] Upload with valid and invalid rows — confirm partial import

### Kanban Board
- [ ] All 5 columns show (Backlog, To Do, In Progress, In Review, Done)
- [ ] Tickets appear in correct columns
- [ ] Drag a ticket to another column and confirm status updates

### Gantt Chart
- [ ] Tickets with start + due dates appear on the chart
- [ ] Tickets without dates appear in the "without dates" table below
- [ ] Clicking a ticket navigates to its detail page
- [ ] Filter by project, status, priority works

### Dashboard
- [ ] Stats load (total projects, tickets, my tickets)
- [ ] Recent activity feed loads
- [ ] My assigned tickets section loads

### User Management (Admin only)
- [ ] Users list loads
- [ ] Create new user
- [ ] Toggle user active/inactive
- [ ] Change user role

### Profile
- [ ] Submit a profile change request
- [ ] Admin approves/rejects from `/admin/requests`
- [ ] Change password works
