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
| Storage | Supabase Storage (private `verification-docs` + public `images` buckets) |
| Image processing | **sharp** — auto-rotate, resize ≤ 1600 px, strip metadata, output WebP quality 80 |
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
│   │   │   ├── auth.controller.js    # 5 auth endpoints
│   │   │   ├── center.controller.js  # 9 center admin endpoints
│   │   │   └── owner.controller.js   # 6 owner panel endpoints
│   │   ├── middleware/
│   │   │   ├── auth.js               # requireAuth + requireRole
│   │   │   └── center.js             # requireCenterAdmin + requireApprovedCenter
│   │   ├── routes/
│   │   │   ├── health.js             # GET /api/health
│   │   │   ├── auth.js               # /api/auth/*
│   │   │   ├── center.js             # /api/center/*
│   │   │   └── owner.js              # /api/owner/*
│   │   ├── utils/
│   │   │   ├── geocode.js            # Nominatim pincode lookup
│   │   │   ├── imageProcessing.js    # sharp re-encode to WebP
│   │   │   ├── imageUpload.js        # multer config + error wrapper
│   │   │   └── storage.js            # Supabase Storage (private + public buckets)
│   │   ├── validators/
│   │   │   ├── auth.validators.js    # Zod schemas (auth)
│   │   │   ├── center.validators.js  # Zod schemas (center + animals)
│   │   │   └── owner.validators.js   # Zod schemas (owner panel)
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
- A Supabase project with:
  - A **private** bucket named `verification-docs` (verification documents for center sign-up)
  - A **public** bucket named `images` (center photos + animal photos — must be public so URLs work without signing)

> **One-photo-per-animal decision:** Each animal has exactly **one** photo. See `docs/decisions.md` for the full list of design decisions that override the PRD/UI brief/tech spec.

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
4. Log in as owner → lands on `/owner`, approve the center
5. Log back in as center admin → redirected to `/center/animals`
6. Complete profile (/center/profile) → add an animal with photo → see it in the animals table
7. While logged in as adopter, navigate to `/center/animals` → redirected to `/home`

---

## 7. Center Admin API Endpoints (Phase 3)

All routes require a logged-in `center_admin` with a center. Write routes (`PATCH`, `POST`, `DELETE`) also require `status = "approved"`.

| Method | Path | Note |
|---|---|---|
| GET | `/api/center` | Own center profile + `profile_complete` + `animal_count` |
| PATCH | `/api/center` | Update profile fields (strict — unknown fields → 400) |
| POST | `/api/center/photo` | Upload / replace center photo (`multipart`, field: `photo`) |
| GET | `/api/center/animals?status=` | Own animals. Default = all except removed. `all` includes removed. |
| POST | `/api/center/animals` | Create animal + photo together (`multipart`, field: `photo`) |
| PATCH | `/api/center/animals/:id` | Update text fields (JSON). No status/center_id. Ownership enforced. |
| DELETE | `/api/center/animals/:id` | Soft-remove (sets `status = "removed"`). Blocked if `pending_pickup`. |
| PATCH | `/api/center/animals/:id/status` | Move `pending_pickup → adopted` or `pending_pickup → available` only. |
| POST | `/api/center/animals/:id/photos` | Replace the single photo. Ownership checked before file. |

**Photo rules:** JPG, PNG or WebP only · max 5 MB · detected from file contents (not extension) · re-encoded with **sharp** (auto-rotate, ≤ 1600 px longest side, strip metadata, WebP quality 80).

**`center_id` rule:** Never taken from the request body or URL for write operations — always loaded fresh from the logged-in admin's DB record.

---

## 8. Adopter Browsing & Animals API Endpoints (Phase 4)

Endpoints available for adopters and authenticated users:

| Method | Path | Auth | Note |
|---|---|---|---|
| GET | `/api/animals` | `requireAuth` (any role) | Filtered browse with Haversine distance sorting. Strict query validation. `Cache-Control: no-store`. |
| GET | `/api/animals/:id` | `requireAuth` (any role) | Animal detail view. UUID validation. `Cache-Control: no-store`. Returns 404 if not found or hidden. |
| PATCH | `/api/me/location` | `requireAuth` + `adopter` | Update adopter location (`pincode`, optional `latitude`/`longitude`). Validates and updates user record. |

### Visibility Rule
An animal is visible to adopters **only** when `animal.status = 'available'` AND its center's status is `center.status = 'approved'`. No request parameter can override this rule.

### Distance Utility & Unit Tests
A pure Haversine distance calculator with Earth radius 6371 km is implemented in `server/src/utils/distance.js`.
To run distance unit tests:
```powershell
cd server
npm run test:distance
```

### Stock Photos
Category and hero stock photos are located in `client/public/images/`:
- `hero.jpg` — Hero section banner on Adopter Home
- `dogs.jpg` — Dogs category card
- `cats.jpg` — Cats category card
- `other.jpg` — Other pets category card

---

## Phases

| Phase | Status |
|---|---|
| 0 — Project setup, DB, design tokens, seed | ✅ Done |
| 1 — Auth, roles, split-panel UI, protected routes | ✅ Done |
| Phase 2 — Owner panel: center approval | ✅ Done |
| Phase 3 — Admin: animal listings with photo upload | ✅ Done |
| Phase 4 — Adopter browse: home, categories, distance | ✅ Done |
| Phase 5A — Adopter applications: form, My Applications, emails | ✅ Done |
| Phase 5B — Center admin: review and decide applications | ✅ Done |
| 6 — Favorites | ⬜ Pending |
| 7 — Food store, cart, orders | ⬜ Pending |
| 8 — Security pass, animated login, deploy | ⬜ Pending |

---

## 9. Phase 5A — Adoption Applications (Adopter side)

### New API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/applications` | `requireAuth` + `adopter` | Submit a new adoption application. Body: `{ animal_id, form_data }`. Returns `{ id }` on success. |
| GET | `/api/applications/mine` | `requireAuth` + `adopter` | List all own applications, newest first. Center contact details included only when `status = "approved"`. |
| PATCH | `/api/applications/:id/cancel` | `requireAuth` + `adopter` | Withdraw a pending application. Atomic single-DB-update (race-condition safe). Returns `{ ok: true }`. |

### Request body for POST /api/applications

```json
{
  "animal_id": "REAL-ANIMAL-ID",
  "form_data": {
    "full_name":           "Jane Smith",
    "phone":               "+91 98765 43210",
    "email":               "jane@example.com",
    "address":             "12 Elm Street, Mumbai",
    "is_adult":            true,
    "home_type":           "apartment",
    "ownership":           "rented",
    "landlord_permission": true,
    "outdoor_space":       false,
    "adults_count":        2,
    "children":            "none",
    "other_pets":          "none",
    "had_pets_before":     true,
    "pet_details":         "1 dog for 5 years",
    "hours_alone":         4,
    "reason":              "I have always wanted to give a rescue animal a loving home.",
    "caregiver":           "Myself",
    "vet_commitment":      true,
    "consent_visit":       true,
    "consent_policy":      true
  }
}
```

### Final form_data field list and rules

| Field | Type | Rule |
|---|---|---|
| `full_name` | string | Required, trimmed, 2–100 chars |
| `phone` | string | Required, trimmed, min 7 chars (same rule as auth signup) |
| `email` | string | Required, valid RFC email, max 150 chars, lowercased |
| `address` | string | Required, trimmed, 5–300 chars |
| `is_adult` | boolean | Must be literal `true` |
| `home_type` | enum | `"house"` or `"apartment"` |
| `ownership` | enum | `"owned"` or `"rented"` |
| `landlord_permission` | boolean \| null | **boolean** when `ownership = "rented"`; **null** (or omitted) when `"owned"` |
| `outdoor_space` | boolean | Required boolean |
| `adults_count` | integer | Real number (not string), integer, 1–20 |
| `children` | string | Required, trimmed, 1–100 chars; write "none" if none |
| `other_pets` | string | Required, trimmed, 1–300 chars; write "none" if none |
| `had_pets_before` | boolean | Required boolean |
| `pet_details` | string \| null | Required non-empty string (max 300) when `had_pets_before = true`; `null` otherwise |
| `hours_alone` | integer | Real number, integer, 0–24 |
| `reason` | string | Required, trimmed, 20–1000 chars |
| `caregiver` | string | Required, trimmed, 5–300 chars |
| `vet_commitment` | boolean | Must be literal `true` |
| `consent_visit` | boolean | Must be literal `true` |
| `consent_policy` | boolean | Must be literal `true` |

> **Strict validation:** The `form_data` object rejects any unknown keys with HTTP 400. No loose coercion — number fields must be sent as JS numbers, boolean fields as booleans.

### Email behaviour

Two emails are sent **after** a successful database save. Email failures are caught and never block the HTTP response.

| Recipient | When | Content |
|---|---|---|
| Adopter's account email | Application submitted | Confirms receipt; names the animal and center; links to My Applications |
| Center's `contact_email` | Application submitted | Names the applicant (`full_name`) and the animal; links to the center dashboard. Skipped if center has no `contact_email`. |

No email is sent when a user withdraws an application.

### Pickup / contact details rule

Center contact details (`address`, `phone`, `contact_email`) are **only included** in the `GET /api/applications/mine` response when the application `status = "approved"`. They are `undefined` (omitted) in all other statuses.

### Test suite

```powershell
cd server
npm run test:applications
```

Runs 15 tests (1 valid body + 14 rejection cases) using Node's built-in `node:test`. No extra packages needed.

---

## 10. Phase 5B — Adoption Applications (Center admin side)

### New API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/center/applications` | `requireCenterAdmin` | List own center's applications. Query param `status` = `pending\|approved\|rejected\|not_selected\|cancelled\|all` (default `pending`). Returns `counts` object with per-status totals and `competing_pending_count` on each pending application. Max 200 results per call. |
| PATCH | `/api/center/applications/:id/approve` | `requireCenterAdmin` | Approve a pending application. Body: `{ note? }` (string ≤ 500 chars, optional). Runs ONE `$transaction`: (1) verifies animal belongs to center and is `available`; (2) sets animal to `pending_pickup`; (3) sets application to `approved`; (4) sets all other pending applications for the same animal to `not_selected`. Post-commit emails to approved applicant and all not-selected applicants. |
| PATCH | `/api/center/applications/:id/reject` | `requireCenterAdmin` | Reject a pending application. Body: `{ note? }`. Single atomic `updateMany` (WHERE `status=pending` + animal's center). Post-commit email to rejected applicant. |

> **center_id is never taken from the request.** It always comes from `req.center.id` (set by `requireCenterAdmin`, loaded fresh from DB on every request). Every query includes `center_id = req.center.id` in its WHERE clause.

### "Return to available" transaction (updateAnimalStatus in center.controller.js)

When a center admin changes an animal's status from `pending_pickup` → `available` (via the existing `PATCH /api/center/animals/:id/status`), the following happens inside **one Prisma `$transaction`**:

1. Read the animal (name + current status) — guards against race.
2. `animal.update` — sets status to `available`.
3. `application.updateMany` — cancels all `approved` applications for that animal (status → `cancelled`).

After the transaction commits, each cancelled applicant receives a `getApplicationCancelledByCenterEmail` email. Email failures are caught and never roll back anything.

### Approve transaction order (correctness guarantee)

The approve transaction deliberately updates the **animal first** (step 2 above), then the application (step 3), then not-selected (step 4). This means two simultaneous approve calls for the same animal will both attempt `updateMany` on `animals WHERE status='available'` — only one will succeed; the second sees 0 rows updated and aborts with 409 (race condition safely handled).

### Status-change rules

| Animal status | Application status set by | Rule |
|---|---|---|
| `available` → `pending_pickup` | Approve action | Atomic; only possible if animal is `available` |
| `pending_pickup` → `available` | "Return to available" | Atomic; approved application cancelled; not-selected are **not** restored |
| `pending_pickup` → `adopted` | "Mark as adopted" | Atomic; approved application stays `approved`; no email |
| `available` → `removed` | Remove animal (Phase 5C, not yet built) | Existing comment left in place |

### Application status set by center admin

| Transition | Triggered by | Emails sent |
|---|---|---|
| `pending` → `approved` | Approve action | Approved applicant (with center contact details + optional note) |
| `pending` → `not_selected` | Auto on approve (all other pending apps for same animal) | Each not-selected applicant |
| `pending` → `rejected` | Reject action | Rejected applicant (optional note, no center contact) |
| `approved` → `cancelled` | "Return to available" | Cancelled applicant (no center contact) |

### Email templates added (Phase 5B)

| Builder | Recipient | Note |
|---|---|---|
| `getApplicationApprovedEmail` | Approved applicant | Includes center address, phone, contact\_email, optional admin note |
| `getApplicationRejectedEmail` | Rejected applicant | Includes optional admin note; no center contact details |
| `getApplicationNotSelectedEmail` | Not-selected applicant | No center contact details, no note |
| `getApplicationCancelledByCenterEmail` | Cancelled (return-to-available) applicant | No center contact details |

All builders HTML-escape every user-supplied value. Email failures are caught with `.catch(() => {})` and never block or roll back any action.

### No adopter account details returned to center admin

The `GET /api/center/applications` response **never** includes `user_id`, `password_hash`, or the adopter's login email. Only `form_data.full_name`, `form_data.phone`, and `form_data.email` (from the application form itself) are visible to the center admin.

### Test suite

```powershell
cd server
npm run test:phase5b
```

Runs **45 tests** across two files:
- `src/validators/centerApplications.validators.test.js` — 21 tests (query schema, UUID param, note body, strict mode)
- `src/utils/email.test.js` — 24 tests (all 4 email builders: non-empty outputs, XSS escaping, presence/absence of center contact details)

Uses Node's built-in `node:test` only. No extra packages needed. Schema.prisma was **not changed** and no migration was created.
