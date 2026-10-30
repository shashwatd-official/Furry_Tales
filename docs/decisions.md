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
