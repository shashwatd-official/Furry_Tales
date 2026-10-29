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
