# Furry Tales — Phase 0

Furry Tales connects animal adoption centers to adopters online with an accompanying pet food store.

Phase 0 provides the foundation: repository folder structure, database schema with Prisma & PostgreSQL, design tokens with Tailwind CSS & Google Fonts, an Express API with database health checks, an idempotent owner seed script, and a React + Vite + React Router placeholder frontend.

---

## Folder Structure

```
furry-tales/
├── docs/                      # Product specs (PRD, UI Brief, Tech Spec)
├── client/                    # React (Vite) + Tailwind CSS + React Router
│   ├── src/
│   │   ├── App.jsx            # Router and placeholder home screen
│   │   ├── index.css          # Tailwind directives & base typography
│   │   └── main.jsx
│   ├── index.html             # Google Fonts (Nunito, Inter)
│   ├── tailwind.config.js     # Design tokens (palette, typography, shadows, radius)
│   └── package.json
├── server/                    # Node.js + Express API
│   ├── prisma/
│   │   ├── schema.prisma      # PostgreSQL schema with all Phase 0 tables
│   │   ├── migrations/        # 0_init migration with constraints
│   │   └── seed.js            # Idempotent owner account seed script
│   ├── src/
│   │   ├── config/db.js       # Prisma client connection
│   │   ├── routes/health.js   # GET /api/health endpoint
│   │   └── index.js           # Express app setup
│   └── package.json
├── .env                       # Environment secrets (ignored by Git)
├── .env.example               # Template environment variables
├── .gitignore                 # Ignores .env, node_modules, build outputs
└── package.json               # Root convenience runner scripts
```

---

## Prerequisites

- **Node.js**: v18+ (verified on Node v24)
- **PostgreSQL**: A running PostgreSQL instance (e.g., Supabase, Neon, or local PostgreSQL)

---

## Step-by-Step Setup Instructions

### 1. Configure Environment Variables

Open the `.env` file in the project root (`c:\Website\Furry Tales\.env`) and fill in your values:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<dbname>?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
OWNER_EMAIL="owner@furrytales.org"
OWNER_PASSWORD="your-secure-owner-password"
EMAIL_API_KEY=""
EMAIL_FROM=""
STORAGE_URL=""
STORAGE_KEY=""
FRONTEND_URL="http://localhost:5173"
```

> **Note**: For local testing of the database connection and seeding, `DATABASE_URL`, `OWNER_EMAIL`, and `OWNER_PASSWORD` are required.

---

### 2. Install Dependencies

Install dependencies for both `server` and `client`:

```bash
# In the project root:
cd server
npm install
cd ../client
npm install
cd ..
```

---

### 3. Set Up Database Schema & Migrations

To apply all tables, enums, foreign keys, and custom constraints:

```bash
cd server
npm run prisma:migrate
npm run prisma:generate
cd ..
```

Alternatively, if developing locally against a new dev database, you can run:
```bash
cd server
npx prisma migrate dev --name init
cd ..
```

---

### 4. Seed the Owner Account

Run the seed script (from the `server` directory or root):

```bash
cd server
npm run seed:owner
```

- Hashes the password using `bcrypt` (10 salt rounds).
- Sets `role` to `owner`.
- Running it a second time will verify the owner exists and will safely skip duplicate creation.

---

### 5. Start the Development Servers

Open two terminal windows:

#### Terminal 1 — Start the Backend Server:
```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000`.

#### Terminal 2 — Start the Frontend Client:
```bash
cd client
npm run dev
```
The client will start on `http://localhost:5173`.

---

## Verifying Phase 0

1. **Verify Health & DB Connection**:
   - Open your browser or use curl:
     ```bash
     curl http://localhost:5000/api/health
     ```
   - Expect response:
     ```json
     {
       "status": "ok",
       "database": "connected",
       "timestamp": "2026-10-27T..."
     }
     ```
2. **Verify Frontend**:
   - Navigate to `http://localhost:5173`
   - You should see the centered card with the Furry Tales paw logo and heading styled with Nunito & warm palette design tokens.
3. **Verify Idempotent Seeding**:
   - Run `npm run seed:owner` again in the `server` directory.
   - Confirm it prints: `Owner account already exists (...). Skipping duplicate creation.`
