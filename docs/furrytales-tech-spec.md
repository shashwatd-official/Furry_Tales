# Technical Spec — Furry Tales

Companion to `furrytales-prd.md`. The PRD says **what** the site does; this says **how it works underneath**. Stack choices below are beginner-friendly defaults, and any of them can be swapped before building.

## How to read the API section (for a first-timer)
An **endpoint** is one "door" on your backend: a method plus a URL path, such as `POST /api/auth/login`. The frontend calls a door, the backend does the work (checks permissions, reads or writes the database), and replies with data and a status code. This spec is a list of every door, who may open it, and what it does. If you can explain one row of the table, you can explain the whole site in an interview.

---

## 1. Stack (defaults)
| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS + React Router | Components suit expanding cards. Routing handles many pages. |
| Backend | Node.js + Express | Same language (JavaScript) as the frontend |
| Database | PostgreSQL (hosted on Supabase or Neon free tier) | Relational data, which fits this schema |
| Image storage | Supabase Storage or Cloudinary | Files go here; the database holds only URLs |
| Email | Resend (or Nodemailer with SMTP for local testing) | Sends confirmation and status emails |
| Auth | Own implementation: bcrypt password hashes + JWT in an `HttpOnly` cookie | Teaches the real flow, and matches what you explain in interviews |
| Distance | Latitude/longitude + Haversine formula | No paid map API needed |
| Geocoding (pincode/address to coordinates) | OpenStreetMap Nominatim, or a free geocoding API | Check its usage policy; fall back to manual lat/lng entry |

*Free tiers and terms change often, so verify the current limits when you set up.*

## 2. Roles and Permissions
| Action | Adopter | Center Admin | Owner |
|---|---|---|---|
| Browse approved animals | Yes | Yes | Yes |
| Apply for an animal | Yes | No | No |
| Add/edit/remove animals | No | **Own center only** | No (suspend the center instead) |
| View applications | **Own only** | **Own center's only** | No |
| Decide applications | No | **Own center's only** | No |
| Approve/reject/suspend centers | No | No | Yes |
| Manage products | No | No | Yes |
| Place orders | Yes | No | No |

**Rule that matters most:** every admin request is checked server-side against the admin's `center_id`. The frontend hiding a button is never the protection.

## 3. Database Schema
All tables have `id` (primary key) and `created_at`, so they're omitted below.

**users**: `name`, `email` (unique), `password_hash`, `role` (`adopter` | `center_admin` | `owner`), `phone`, `city`, `pincode`, `latitude`, `longitude`, `center_id` (nullable FK, set only for center_admin)
*One table with a role column instead of separate Users and Admins tables. One login endpoint works for everyone, and the role decides what they can do.*

**centers**: `name`, `address`, `city`, `pincode`, `latitude`, `longitude`, `contact_email`, `phone`, `description`, `photo_url`, `verification_doc_url`, `status` (`pending` | `approved` | `rejected` | `suspended`), `rejection_reason`, `reviewed_at`, `reviewed_by` (FK users)

**animals**: `center_id` (FK), `name`, `category` (`dog` | `cat` | `other`), `breed`, `age_months`, `gender`, `size`, `good_with_kids` (bool), `good_with_pets` (bool), `vaccinated` (bool), `neutered` (bool), `description`, `story`, `status` (`available` | `pending_pickup` | `adopted` | `removed`)

**animal_photos**: `animal_id` (FK), `url`, `is_primary`, `position`

**applications**: `user_id` (FK), `animal_id` (FK), `center_id` (FK), `form_data` (JSON of all form answers), `status` (`pending` | `approved` | `rejected` | `not_selected` | `cancelled`), `admin_note`, `decided_at`
*Constraint: one active (pending) application per user per animal.*

**favorites**: `user_id` (FK), `animal_id` (FK). The pair is unique.

**products**: `name`, `category`, `description`, `price`, `stock_count` (never below 0), `image_url`, `is_active`

**orders**: `user_id` (FK), `status` (`placed` | `confirmed` | `completed` | `cancelled`), `total`, `delivery_address`, `phone`

**order_items**: `order_id` (FK), `product_id` (FK), `quantity`, `price_at_purchase`
*Price is saved at purchase time so later price changes don't rewrite old orders.*

## 4. API Endpoints
Auth column: **Public** = no login · **Any** = any logged-in user · otherwise the role needed. "Own" means the server checks ownership.

### Auth
| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/auth/signup/adopter` | Public | Create an adopter. Hash password, geocode pincode. |
| POST | `/api/auth/signup/center` | Public | Create a center_admin plus a center with status `pending`. |
| POST | `/api/auth/login` | Public | Check credentials with `bcrypt.compare`, set the auth cookie. Generic "Invalid credentials" error. |
| POST | `/api/auth/logout` | Any | Clear the cookie. |
| GET | `/api/auth/me` | Any | Return the current user, role and center status. The frontend uses this on every page load. |

### Owner: center approval
| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/owner/centers?status=pending` | Owner | List centers by status. |
| PATCH | `/api/owner/centers/:id/approve` | Owner | Set `approved`, send email. |
| PATCH | `/api/owner/centers/:id/reject` | Owner | Set `rejected` with a reason, send email. |
| PATCH | `/api/owner/centers/:id/suspend` | Owner | Set `suspended`. Its animals disappear from browsing. |

### Center admin: center and animals
| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/center` | Admin | Own center profile. |
| PATCH | `/api/center` | Admin | Update own center profile. |
| GET | `/api/center/animals` | Admin | Own center's animals, all statuses. |
| POST | `/api/center/animals` | Admin (approved center) | Create an animal. |
| PATCH | `/api/center/animals/:id` | Admin (own) | Edit an animal. |
| DELETE | `/api/center/animals/:id` | Admin (own) | Set status to `removed` (soft delete). |
| POST | `/api/center/animals/:id/photos` | Admin (own) | Upload photos (file type and size checked). |
| DELETE | `/api/center/animals/:id/photos/:photoId` | Admin (own) | Remove a photo. |
| PATCH | `/api/center/animals/:id/status` | Admin (own) | Move status, e.g. `pending_pickup` to `adopted` or back to `available`. |

### Adopter: browsing
| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/animals?category=dog&ageMin=&ageMax=&size=&goodWithKids=` | Any | Available animals from approved centers, with `distance_km` from the user, sorted nearest first. |
| GET | `/api/animals/:id` | Any | Full detail of one animal with photos and center info. |
| GET | `/api/favorites` | Adopter | List favorites. |
| POST | `/api/favorites/:animalId` | Adopter | Add a favorite. |
| DELETE | `/api/favorites/:animalId` | Adopter | Remove a favorite. |

### Applications
| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/applications` | Adopter | Submit an application for an available animal. Validate form data, save, send two emails. |
| GET | `/api/applications/mine` | Adopter | Own applications with statuses. |
| PATCH | `/api/applications/:id/cancel` | Adopter (own) | Withdraw a pending application. |
| GET | `/api/center/applications` | Admin | Own center's applications. |
| PATCH | `/api/center/applications/:id/approve` | Admin (own) | Approve (see business rule 1). |
| PATCH | `/api/center/applications/:id/reject` | Admin (own) | Reject with an optional note, send email. |

### Store
| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/products?category=&q=` | Any | List active products. Optional filters: `category` and a search term `q` (matches name/description). |
| POST/PATCH/DELETE | `/api/owner/products` (and `/:id`) | Owner | Manage products. |
| POST | `/api/owner/products/:id/image` | Owner | Upload a product image (type and size checked). |
| POST | `/api/orders` | Adopter | Place an order from the browser cart (see business rules 2 and 7). |
| GET | `/api/orders/mine` | Adopter | Own orders. |
| GET | `/api/owner/orders` | Owner | All orders. |
| PATCH | `/api/owner/orders/:id/status` | Owner | Update order status. |

## 5. Business Rules (the "what if" logic)

**1. Approving an application (prevents double adoption).** In one **database transaction**:
- Update the animal with `status = 'pending_pickup' WHERE id = ? AND status = 'available'`. If zero rows changed, someone else already got there, so stop and return an error.
- Set this application to `approved`.
- Set all other `pending` applications for the same animal to `not_selected` and email those applicants.
- Send the approval email.
If the adopter doesn't show, the admin sets the animal back to `available` and the approved application becomes `cancelled`.

**2. Placing an order (prevents overselling).** In one transaction, for each item run `UPDATE products SET stock_count = stock_count - :qty WHERE id = :id AND stock_count >= :qty`. If any row doesn't update, roll back the whole order and tell the user which item ran out. Never check stock first and then update in a separate step.

**3. Visibility.** Animals show to adopters only when `animal.status = 'available'` and `center.status = 'approved'`.

**4. Center approval gate.** A center admin whose center isn't `approved` can sign in but sees only the Pending/Rejected screen, and all `/api/center/*` write endpoints refuse.

**5. Emails sent:** application submitted (adopter + center) · application approved/rejected/not selected (adopter) · center approved/rejected (admin) · order placed (adopter). Email failure must not block the action; log it and move on.

**6. Distance.** Computed with the Haversine formula between the adopter's saved coordinates and each center's coordinates. If an adopter has no coordinates, sort alphabetically and show a "set your location" prompt.

**7. Cart.** The cart lives in the browser (React state, saved to `localStorage`) until checkout. There are no cart tables and no cart endpoints. `POST /api/orders` receives only product IDs and quantities. The server re-reads prices and stock from the database and never trusts prices sent by the browser.

## 6. Conventions
- Responses are JSON. Errors look like `{ "error": "message" }` with the right status: 400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict (e.g. animal already taken).
- Validate every request body on the backend (use a validation library such as Zod).
- Use parameterized queries or an ORM (e.g. Prisma). Never build SQL by joining strings.
- Image uploads: allow only JPG/PNG/WebP, limit size (e.g. 5 MB), and rename files on upload.

## 7. Environment Variables (`.env`, never committed to Git)
`DATABASE_URL` · `JWT_SECRET` · `OWNER_EMAIL` · `OWNER_PASSWORD` (used once by the seed script) · `EMAIL_API_KEY` · `EMAIL_FROM` · `STORAGE_URL` / `STORAGE_KEY` (or Cloudinary keys) · `FRONTEND_URL` (for CORS)
Add `.env` to `.gitignore` before the first commit.

## 8. Security Checklist (must pass in Phase 8)
- [ ] Passwords hashed with bcrypt; login says only "Invalid credentials"
- [ ] Auth cookie is `HttpOnly`, `Secure` and `SameSite`; HTTPS everywhere in production
- [ ] Every admin endpoint checks `center_id` ownership on the server
- [ ] Every adopter endpoint checks the record belongs to that user (no changing an ID in the URL to see someone else's application)
- [ ] All inputs validated on the backend; uploads restricted by type and size
- [ ] Rate limiting on login, signup and application endpoints
- [ ] CORS allows only the real frontend URL
- [ ] No secrets in code or Git history; error messages don't leak stack traces
- [ ] Transactions used for application approval and order placement (rules 1 and 2)
- [ ] The owner account can't be created through public sign-up

## 9. Suggested Folder Structure
```
furry-tales/
  docs/            prd, ui brief, tech spec
  client/          React app (pages, components, api helpers; public/images/ holds the bundled stock photos for the home page)
  server/          Express app (routes, controllers, middleware, db, emails)
  .env  .gitignore  README.md
```
