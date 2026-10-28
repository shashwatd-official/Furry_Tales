# Furry Tales

> Where every animal has a story, and every adoption begins a new one.

A full-stack pet adoption + food store platform built with React + Vite + Tailwind CSS on the frontend and Node.js + Express + Prisma + PostgreSQL on the backend.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 3 + React Router 7 |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL via Prisma 6 |
| Auth | bcrypt + JWT in HttpOnly cookie |
| Storage | Supabase Storage (private bucket) |
| Geocoding | OpenStreetMap Nominatim |

---

## Folder Structure

```
furry-tales/
├── docs/                             # PRD, UI Brief, Tech Spec
├── client/                           # React (Vite) frontend
│   ├── src/
│   │   ├── api/index.js              # Axios API helpers
│   │   ├── components/
│   │   │   ├── RequireRole.jsx       # Role-protected route guard
│   │   │   └── RootRoute.jsx         # / redirect logic
│   │   ├── context/AuthContext.jsx   # Auth state & /api/auth/me
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         # Split-panel sign-in/sign-up
│   │   │   ├── AdopterHome.jsx       # Adopter placeholder
│   │   │   ├── CenterDashboard.jsx   # Pending/Rejected/Approved screens
│   │   │   └── OwnerPanel.jsx        # Owner placeholder
│   │   ├── App.jsx                   # Router + AuthProvider
│   │   └── index.css                 # Tailwind + base typography
│   ├── tailwind.config.js            # Design tokens
│   ├── vite.config.js                # /api proxy to :5000
│   └── package.json
├── server/                           # Express API
│   ├── prisma/
│   │   ├── schema.prisma             # All 9 tables
│   │   ├── migrations/0_init/        # SQL migration
│   │   └── seed.js                   # Owner account seed
│   ├── src/
│   │   ├── config/db.js              # Prisma client
│   │   ├── controllers/
│   │   │   └── auth.controller.js    # 5 auth endpoints
│   │   ├── middleware/
│   │   │   └── auth.js               # requireAuth + requireRole
│   │   ├── routes/
│   │   │   ├── health.js             # GET /api/health
│   │   │   └── auth.js               # /api/auth/*
│   │   ├── utils/
│   │   │   ├── geocode.js            # Nominatim pincode lookup
│   │   │   └── storage.js            # Supabase Storage upload
│   │   ├── validators/
│   │   │   └── auth.validators.js    # Zod schemas
│   │   └── index.js                  # Express app
│   └── package.json
├── .env                              # Secrets (git-ignored)
├── .env.example                      # Variable names, empty values
├── .gitignore
└── README.md
```

---

## Prerequisites

- Node.js v18+
- PostgreSQL database (Supabase, Neon, or local)
- A Supabase project with a **private** bucket named `verification-docs`

---

> ⚠️ **CRITICAL DATABASE RULE**
> Never run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` on this project. It contains database rules and custom triggers/constraints Prisma cannot see. Only use `npm run prisma:migrate` (which runs `prisma migrate deploy`).

---

## 1. Configure Environment

Fill in `c:\Website\Furry Tales\.env` (the root `.env` file, **not** inside `server/`):

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<dbname>?schema=public"
JWT_SECRET="your-very-long-random-secret"
OWNER_EMAIL="owner@furrytales.org"
OWNER_PASSWORD="your-owner-password"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="Furry Tales <no-reply@furrytales.org>"
STORAGE_URL="https://<your-project>.supabase.co"
STORAGE_KEY="<your supabase service_role key>"
FRONTEND_URL="http://localhost:5173"
```

> **How to create a Gmail App Password for local email testing:**
> 1. Sign in to your Google Account.
> 2. Go to **Security** → **2-Step Verification** (ensure 2-Step Verification is ON).
> 3. Scroll to the bottom of the page and select **App passwords**.
> 4. Enter a name (e.g. `Furry Tales Local`) and click **Create**.
> 5. Copy the 16-character generated password (without spaces) and paste it as `SMTP_PASS` in your `.env`.
> 6. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_USER=your-email@gmail.com`.

> **Supabase Storage setup (one-time):**
> 1. Go to your Supabase dashboard → Storage → New bucket
> 2. Name it `verification-docs`, set it to **Private**
> 3. Copy the **service_role** key from Settings → API → Project API Keys → `service_role`
> 4. Paste it as `STORAGE_KEY` in `.env`

---

## 2. Install Dependencies

```powershell
cd server
npm install

cd ..\client
npm install
```

---

## 3. Set Up the Database

Deploy migrations to your database:

```powershell
cd server
npm run prisma:migrate      # deploys migrations via `prisma migrate deploy`
npm run prisma:generate     # generates the Prisma client
```

---

## 4. Seed the Owner Account

```powershell
cd server
npm run seed:owner
```

- Creates the owner account using `OWNER_EMAIL` and `OWNER_PASSWORD` from `.env`
- Password is bcrypt-hashed (12 rounds)
- Running it twice is safe — it skips if the owner already exists

---

## 5. Start Both Servers

Open **two** terminal windows:

**Terminal 1 — Backend (port 5000):**
```powershell
cd server
npm run dev
```

**Terminal 2 — Frontend (port 5173):**
```powershell
cd client
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## 6. Test Checklist

### Verify health + DB
```powershell
Invoke-RestMethod http://localhost:5000/api/health
# → { status: "ok", database: "connected", ... }
```

### Test auth endpoints directly
```powershell
# Must return 401 (no cookie)
Invoke-WebRequest http://localhost:5000/api/auth/me -ErrorAction SilentlyContinue

# Must return 401 with "Invalid credentials." (not "user not found")
$body = '{"email":"nobody@example.com","password":"wrong"}'
Invoke-WebRequest http://localhost:5000/api/auth/login -Method POST -ContentType "application/json" -Body $body -ErrorAction SilentlyContinue
```

### User flow
1. Go to http://localhost:5173 → see the two-panel login screen
2. Sign up as adopter → lands on `/home`
3. Sign up as center admin (with a PDF/JPG/PNG doc) → lands on `/center` (Pending screen)
4. Log in as owner (use the **center panel**) → lands on `/owner`
5. While logged in as adopter, manually navigate to `/center` or `/owner` → redirected to `/home`
6. Log out → trying any protected URL redirects to `/`

---

## Phases

| Phase | Status |
|---|---|
| 0 — Project setup, DB, design tokens, seed | ✅ Done |
| 1 — Auth, roles, split-panel UI, protected routes | ✅ Done |
| Phase 2 — Owner panel: center approval | ✅ Done |
| Phase 3 — Admin: animal listings with photo upload | ⬜ Next |
| 4 — Adopter browse: home, categories, distance | ⬜ Pending |
| 5 — Applications: form, review, status | ⬜ Pending |
| 6 — Favorites | ⬜ Pending |
| 7 — Food store, cart, orders | ⬜ Pending |
| 8 — Security pass, animated login, deploy | ⬜ Pending |
