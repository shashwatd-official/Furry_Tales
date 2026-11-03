# Decisions — Furry Tales

These decisions override the PRD, UI brief and tech spec where they differ.

---

## 1. One Photo Per Animal

Each animal has exactly **one** photo. The same photo is used for the small card, the expanded detail card and the admin screens. No galleries, no extra photos, no cover selection, no photo reordering.

The PRD and UI brief mention multiple photos; this decision replaces that.

**Implementation:** Use the existing `animal_photos` table with exactly ONE row per animal (`is_primary = true`, `position = 0`). The table structure is unchanged.

---

## 2. No Photo-Delete Endpoint

The `DELETE /api/center/animals/:id/photos/:photoId` endpoint is **NOT built**, because a photo is required for every animal.

The only photo actions are:
- **Set it when creating** — photo is required when `POST /api/center/animals` is called.
- **Replace it** — `POST /api/center/animals/:id/photos` replaces the single photo.

---

## 3. Allowed Values for gender, size and category

These fields are stored in lowercase exactly as listed below. Zod validation on the server is the only guard; anything else is rejected with 400.

| Field | Allowed values |
|---|---|
| `gender` | `"male"`, `"female"` |
| `size` | `"small"`, `"medium"`, `"large"` |
| `category` | `"dog"`, `"cat"`, `"other"` |

The database columns for `gender` and `size` are plain text columns; there is no database-level enum for them, so server-side Zod validation is the only enforcement.

---

## 4. Photo File Rules

- Allowed formats: **JPG, PNG, WebP** only (detected from file contents using `file-type`, not the extension).
- Maximum size: **5 MB**.
- Re-encoding: All uploads are re-encoded with **sharp** — auto-rotated from EXIF, resized to longest side ≤ 1600 px (never upscaled), all metadata stripped, output as WebP quality 80.

---

## 5. Animal Removal (Soft Delete)

Animals are **never hard-deleted**. "Remove" sets `status = "removed"`. The photo is kept in storage.

---

## 6. Animal Status Transitions

- `POST /api/center/animals` always creates with `status = "available"`.
- `PATCH /api/center/animals/:id/status` accepts `status` of `"adopted"` or `"available"` only when the animal is currently `"pending_pickup"`.
- `DELETE /api/center/animals/:id` (soft remove) is blocked if the animal is `"pending_pickup"` — returns 409.

---

## Phase 4 decisions

- **One photo per animal:** The same `photo_url` is used on the small card and, larger, in the detail panel. No galleries, carousels or thumbnail strips.
- **Age filter values:** Whole months (`animals.age_months`, 0 to 360). Age band mapping: Any age (no filter), Under 1 year (0 to 11), 1 to under 3 years (12 to 35), 3 to under 8 years (36 to 95), 8 years and over (96 to 360).
- **Visibility rule:** An animal is visible to adopters ONLY when `animal.status = 'available'` AND its center's status is `center.status = 'approved'`. No request parameter can override this.
- **Animal fields sent to adopters:**
  - List cards: `id`, `name`, `category`, `age_months`, `gender`, `size`, `photo_url`, `distance_km`, `center_name`, `center_city`.
  - Detail panel: those same fields plus `breed`, `good_with_kids`, `good_with_pets`, `vaccinated`, `neutered`, `description`, `story`, `status`. Nothing else (no center contact details, no center id, no document paths, no other users' data).
- **Detail view layout:** A full-width panel opened directly beneath the row of the clicked card (beneath the card itself on a one-column phone layout), so the order of cards never changes and no empty gaps appear.
- **Actions in detail panel:** "Add to favorites" and "Fill adoption form" are displayed as disabled buttons with visible text "Coming soon" until Phases 5 and 6. The small cards have no heart icon yet.
- **Food store card:** Displayed on the Home page as a non-clickable "Coming soon" card.
- **Navigation:** Navigation links only to pages that exist (`/home` and `/animals`). No links for Favorites, Food Store, or My Applications.
- **Center vs Adopter animal endpoints:** Center pages use only `/api/center/*` for animals. Adopter pages use only `/api/animals`. Never share one client helper between the two areas.

---

## Phase 5A decisions

- **Application form fields:** Exactly these sections, in order: Applicant Details (full name, phone, email prefilled, address, confirm age 18+), Home & Lifestyle (house or apartment, owned or rented, landlord permission if rented, outdoor space), Household (number of adults, children ages free-text, other pets free-text), Experience (pets owned before, hours alone daily), Motivation & Care (why adopting, who cares for pet, vet-care commitment), Consent (agree to home/center visit AND adoption policy). All required unless noted.
- **Re-applying after rejection/cancellation:** An adopter may submit a new application after a previous application for the same animal became `rejected`, `not_selected`, or `cancelled`. The only block is an existing `pending` application for the same animal. The database unique index enforces this; the server maps Prisma P2002 error to HTTP 409.
- **Email recipients:** Application-received confirmation → logged-in adopter's own account email. New-application notification → center's `contact_email` (loaded fresh from DB, never from the browser).
- **Center contact details in applications:** Center address, phone, and contact_email are shown to an adopter ONLY inside an application whose status is `approved`. Not shown for pending, rejected, not_selected, or cancelled applications.
- **Phone field:** Not prefilled. Adopter must type it in the form.
- **Name and email fields:** Prefilled from the logged-in user's account data (`req.user.name`, `req.user.email`). Adopter may edit the name; email is read-only.
- **No persistent form state:** The in-progress form lives in React component state only. No localStorage, no sessionStorage. If the page is refreshed, the form resets.
- **Animal availability check:** `POST /api/applications` rejects with 409 if the animal's status is not `available` or its center's status is not `approved`. The check is done inside the database query (no two-step check-then-insert).
- **Withdraw (cancel) rule:** Only the adopter who owns the application can cancel it, and only while it is `pending`. Status is set to `cancelled`. No email is sent on cancellation (adopter initiated it).
- **"Fill adoption form" button:** Enabled in `AnimalDetailPanel` when the detail panel is loaded. Navigates to `/apply/:animalId`. A "pending application" indicator is shown if the adopter already has a pending application for that animal (detected from `GET /api/applications/mine` cached in the page).
- **My Applications navigation link:** Added to `AdopterLayout` nav (desktop and mobile). It links to `/my-applications` and is visible now that the page exists.
- **Scope:** Phase 5A covers only the adopter side. `GET /api/center/applications`, `PATCH /api/center/applications/:id/approve`, and `PATCH /api/center/applications/:id/reject` are NOT built in this phase (Phase 5B). The existing "PHASE 5" TODO comments in center animal code are left untouched.

---

## Phase 5A final application form fields

These field names are final and canonical. They are used identically in the server's `form_data` Zod schema, the database's `form_data` JSON column, and the React form's payload. A mismatch is a 400.

| Field | Server type | Rule |
|---|---|---|
| `full_name` | string | Required, trimmed, 2–100 chars |
| `phone` | string | Required, trimmed, min 7 chars (auth rule, required) |
| `email` | string | Required, valid RFC email, max 150, lowercased |
| `address` | string | Required, trimmed, 5–300 chars |
| `is_adult` | boolean | Must be literal `true` |
| `home_type` | enum | `"house"` or `"apartment"` |
| `ownership` | enum | `"owned"` or `"rented"` |
| `landlord_permission` | boolean \| null | `true` or `false` when ownership = "rented"; `null` when "owned" |
| `outdoor_space` | boolean | Required boolean (not a string "yes"/"no") |
| `adults_count` | integer | Real JS number (no string coerce), integer, 1–20 |
| `children` | string | Required, trimmed, 1–100 chars; write "none" if no children |
| `other_pets` | string | Required, trimmed, 1–300 chars; write "none" if no pets |
| `had_pets_before` | boolean | Required boolean |
| `pet_details` | string \| null | Required, non-empty, max 300 when `had_pets_before = true`; `null` otherwise |
| `hours_alone` | integer | Real JS number, integer, 0–24 |
| `reason` | string | Required, trimmed, 20–1000 chars |
| `caregiver` | string | Required, trimmed, 5–300 chars |
| `vet_commitment` | boolean | Must be literal `true` (checkbox, not free-text) |
| `consent_visit` | boolean | Must be literal `true` |
| `consent_policy` | boolean | Must be literal `true` |

### Decisions from the Phase 5A fix (2026-11-03)

- **Nested body structure:** The server now expects `{ animal_id, form_data: {...} }` at the top level (strict — unknown top-level keys → 400). Previously the body was flat; the flat structure caused every console `POST` to fail with 400.
- **Children and other-pets fields:** Stay as free-text strings named `children` and `other_pets` (not yes/no toggles). Both are required and non-empty; the adopter writes "none" if inapplicable.
- **Vet-care commitment:** Changed back to a required boolean checkbox (`vet_commitment: true`). The previous textarea is removed from both the form and the server schema.
- **Landlord permission:** Changed from string enum ("yes"/"no"/"na") to a real boolean (`true`/`false`) when rented, or `null` when owned.
- **Outdoor space:** Changed from string enum ("yes"/"no") to a real boolean.
- **No string coercion:** `adults_count` and `hours_alone` reject string values like `"2"`. The React form must send `Number(...)` explicitly.
- **Withdraw (cancel):** Now a single atomic `updateMany` with all three conditions in the `WHERE` clause. This prevents a race condition in Phase 5B where a center could approve an application at the same time the adopter cancels it.
- **Cancelled vs Withdrawn:** The status value in the database is `cancelled`. The UI label is "Cancelled" (not "Withdrawn") with a ✕ icon. The withdraw button still says "Withdraw application".
- **Pending indicator in detail panel:** Changed from plain text to a link ("You've applied: view your application") pointing to `/my-applications`.
- **Focus management:** When a step is blocked by validation, the browser moves focus to the first invalid field, which also has `aria-invalid` and `aria-describedby` set.

