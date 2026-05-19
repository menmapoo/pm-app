# PM App — Project Management Application

A full-featured project management web application inspired by Jira. Built with React, TypeScript, Node.js, Express, PostgreSQL, and Prisma.

---

## Features

- **Authentication** — JWT-based login/register with role-based access control
- **Dashboard** — Stats, charts, assigned tickets, and activity feed
- **Projects** — Create, edit, archive projects with team member management
- **Import Projects** — Bulk-import projects from CSV or Excel with partial-import support
- **Import Tickets** — Bulk-import tickets from CSV or Excel with validation preview
- **Export Projects** — Download all projects as Excel (.xlsx)
- **Export Tickets** — Download all tickets as Excel (.xlsx)
- **Tickets** — Full issue tracker with types, statuses, priorities, assignees, comments
- **Kanban Board** — Drag-and-drop board across 5 columns
- **Gantt Chart** — Timeline view of projects and tickets with date filtering
- **Comments** — Threaded comments on tickets with edit/delete
- **Activity Log** — Audit trail for all important actions
- **User Management** — Admin panel to manage users and roles
- **Profile** — Users can request name/email/bio changes; admins approve/reject

## Roles

| Role | Access |
|------|--------|
| Admin | Full access, user management |
| Project Manager | Create/edit projects and tickets |
| Developer | Create/edit tickets, comment |
| Viewer | Read-only access |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| State | Zustand |
| Routing | React Router v6 |
| Drag & Drop | @hello-pangea/dnd |
| Gantt | gantt-task-react |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) |
| Validation | express-validator |

---

## Project Structure

```
PM-APP/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── seed.ts             # Seed data
│   │   └── migrations/         # Migration history
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth, role guards
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic (import/export, Gantt)
│   │   ├── utils/              # JWT, Prisma client, Multer upload
│   │   └── index.ts            # Express app entry
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Button, Input, Modal, Badge, Select...
│   │   │   ├── layout/         # Sidebar, Navbar, AppLayout
│   │   │   └── import/         # File dropzone, preview, error table
│   │   ├── pages/              # Dashboard, Projects, Tickets, Board, Gantt, Users
│   │   ├── services/           # Axios API client
│   │   ├── store/              # Zustand auth store
│   │   └── types/              # TypeScript types
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

---

### Step 1 — Clone and enter the project

```bash
cd PM-APP
```

### Step 2 — Backend setup

```bash
cd backend
npm install
```

Copy and configure environment variables:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pmapp?schema=public"
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

Run database migrations:

```bash
npx prisma migrate dev --name init
```

Generate Prisma client:

```bash
npx prisma generate
```

Seed the database:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

Backend runs at `http://localhost:5000`

---

### Step 3 — Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

> No `.env` needed for local development — the Vite dev server proxies `/api` requests to `http://localhost:5000` automatically.

---

## Demo Accounts

After seeding, use these accounts to log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pmapp.com | password123 |
| Project Manager | pm@pmapp.com | password123 |
| Developer | dev1@pmapp.com | password123 |
| Developer | dev2@pmapp.com | password123 |
| Viewer | viewer@pmapp.com | password123 |

---

## API Reference

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Server health check |

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /auth/register | Public | Register new user |
| POST | /auth/login | Public | Login |
| GET | /auth/me | Protected | Get current user |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /users | Protected | List all users |
| GET | /users/:id | Protected | Get user by ID |
| POST | /users | Admin | Create user |
| PUT | /users/:id | Admin | Update user |
| PATCH | /users/:id/toggle-status | Admin | Enable/disable user |

### Projects

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /projects | Protected | List projects |
| GET | /projects/:id | Protected | Get project |
| POST | /projects | PM/Admin | Create project |
| PUT | /projects/:id | PM/Admin | Update project |
| DELETE | /projects/:id | PM/Admin | Delete project |
| POST | /projects/:id/members | PM/Admin | Add member |
| DELETE | /projects/:id/members/:userId | PM/Admin | Remove member |
| PATCH | /projects/:id/members/:userId | PM/Admin | Update member role |

### Project Import & Export

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /projects/export | PM/Admin | Download projects as .xlsx |
| GET | /projects/import/template | PM/Admin | Download sample CSV template |
| POST | /projects/import/preview | PM/Admin | Parse & validate file — no DB write |
| POST | /projects/import/confirm | PM/Admin | Import valid rows, skip invalid |

### Tickets

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /tickets | Protected | List tickets (with filters) |
| GET | /tickets/kanban?projectId= | Protected | Get kanban columns |
| GET | /tickets/:id | Protected | Get ticket |
| POST | /tickets | Protected | Create ticket |
| PUT | /tickets/:id | Protected | Update ticket |
| DELETE | /tickets/:id | Protected | Delete ticket |
| PATCH | /tickets/:id/status | Protected | Update ticket status |

### Ticket Import & Export

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /tickets/export | PM/Admin | Download tickets as .xlsx |
| GET | /tickets/import/template | PM/Admin | Download sample CSV template |
| POST | /tickets/import/preview | PM/Admin | Parse & validate file — no DB write |
| POST | /tickets/import/confirm | PM/Admin | Import valid rows, skip invalid |

### Comments

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /comments/ticket/:ticketId | Protected | Get ticket comments |
| POST | /comments/ticket/:ticketId | Protected | Add comment |
| PUT | /comments/:id | Protected | Edit own comment |
| DELETE | /comments/:id | Protected | Delete own comment (Admin: any) |

### Activity

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /activity | Protected | Get activity logs |

### Dashboard

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /dashboard/stats | Protected | Get dashboard stats |

### Gantt

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /gantt | Protected | Get Gantt chart data |

---

## Import & Export

### Supported file types (import)

- `.csv` — comma-separated values
- `.xlsx` — Excel 2007+
- `.xls` — Excel 97-2003
- Max file size: **5MB**

### Partial import behavior

Invalid rows never block the whole import:
- Valid rows are imported immediately
- Rows with errors are skipped and listed in the validation table
- After import: *"Import completed: X records imported, Y rows skipped."*

### Importing Projects

| Column | Required | Notes |
|--------|----------|-------|
| `name` | Yes | Project display name |
| `key` | Yes | Unique uppercase identifier (e.g. `FSS`) |
| `description` | No | |
| `status` | No | `active` or `archived` — defaults to `active` |

### Importing Tickets

| Column | Required | Notes |
|--------|----------|-------|
| `title` | Yes | |
| `projectKey` | Yes | Must match an existing project key |
| `description` | No | |
| `type` | No | `bug` / `task` / `story` / `improvement` |
| `status` | No | `backlog` / `todo` / `in_progress` / `in_review` / `done` |
| `priority` | No | `low` / `medium` / `high` / `highest` |
| `assigneeEmail` | No | Must match an existing user email |
| `dueDate` | No | `YYYY-MM-DD` format |

---

## Production Deployment

### Recommended Hosting

| Service | Provider |
|---------|----------|
| Frontend | Vercel or Netlify |
| Backend | Render or Railway |
| Database | Neon, Supabase, Railway, or Render PostgreSQL |

---

### Step 1 — Create a PostgreSQL database

Create a free database on one of:
- [Neon](https://neon.tech) — free tier, serverless PostgreSQL
- [Supabase](https://supabase.com) — free tier
- [Railway](https://railway.app) — PostgreSQL add-on
- [Render](https://render.com) — PostgreSQL add-on

Copy the connection string — it looks like:
```
postgresql://user:password@host:5432/dbname?sslmode=require
```

---

### Step 2 — Deploy backend to Render

**Render settings:**

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build && npx prisma generate` |
| Start Command | `npm run prisma:migrate && npm run start` |
| Node Version | 18 |

**Environment variables (set in Render dashboard):**

```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=your-very-secret-key-at-least-32-chars
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app
```

After deploy, note your backend URL: `https://your-backend.onrender.com`

Test it: `https://your-backend.onrender.com/api/health`

---

### Step 3 — Deploy frontend to Vercel

**Vercel settings:**

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Framework Preset | Vite |

**Environment variable (set in Vercel dashboard):**

```
VITE_API_URL=https://your-backend.onrender.com/api
```

After deploy, note your frontend URL: `https://your-frontend.vercel.app`

---

### Step 4 — Update CORS on backend

Go back to Render and update `FRONTEND_URL` to your actual Vercel URL:

```
FRONTEND_URL=https://your-frontend.vercel.app
```

Render will automatically redeploy.

---

### Step 5 — Test the deployed app

1. Visit `https://your-frontend.vercel.app`
2. Login with `admin@pmapp.com` / `password123`
3. Check Dashboard loads stats
4. Create a project, create a ticket
5. Try the Kanban board drag-and-drop
6. Try the Gantt chart
7. Try importing a CSV file

---

## Environment Variables Reference

### Backend `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing — use a strong random value in production |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `PORT` | No | Server port (default: `5000`) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS (e.g. `https://your-app.vercel.app`) |

### Frontend `.env`

| Variable | Required in prod | Description |
|----------|-----------------|-------------|
| `VITE_API_URL` | Yes | Full backend API URL (e.g. `https://your-backend.onrender.com/api`) |

> In local development, `VITE_API_URL` is not needed — the Vite proxy handles `/api` requests automatically.

---

## Running in Production (self-hosted)

### Backend

```bash
cd backend
npm install
npm run build
npx prisma generate
npx prisma migrate deploy
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run build
# Serve the dist/ folder with nginx, Apache, or any static server
```

---

## Database Schema

```
User               — id, email, password, name, role, avatar, bio, isActive
Project            — id, name, description, key, status
ProjectMember      — projectId, userId, role
Ticket             — id, key, title, description, type, status, priority, startDate, dueDate, projectId, assigneeId, reporterId
Comment            — id, content, ticketId, authorId
ActivityLog        — id, action, entity, entityId, details, userId, projectId, ticketId
ProfileChangeRequest — id, userId, requestedName, requestedEmail, requestedBio, status, adminNote, reviewedById
```
