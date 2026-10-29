const { z } = require('zod');

// ── Shared helpers ─────────────────────────────────────────────────────────────

const uuidParam = z.object({
  id: z.string().uuid({ message: 'Invalid ID.' }),
});

// Latitude: -90 to +90
const latitudeField = z
  .number({ invalid_type_error: 'Latitude must be a number.' })
  .min(-90, 'Latitude must be between -90 and 90.')
  .max(90, 'Latitude must be between -90 and 90.');

// Longitude: -180 to +180
const longitudeField = z
  .number({ invalid_type_error: 'Longitude must be a number.' })
  .min(-180, 'Longitude must be between -180 and 180.')
  .max(180, 'Longitude must be between -180 and 180.');

// Phone: min 7 chars, trimmed
const phoneField = z
  .string()
  .trim()
  .min(7, 'Please enter a valid phone number.');

// Pincode: min 3 chars, trimmed
const pincodeField = z
  .string()
  .trim()
  .min(3, 'Pincode is too short.');

// ── PATCH /api/center (profile update) ────────────────────────────────────────
//
// Strict: rejects any unknown field with a 400 pointing out the unknown key.
// Only these fields may be updated; status, id, verification_doc_url, etc.
// are all unknown and will be rejected.
const updateCenterSchema = z
  .object({
    name: z.string().trim().min(2, 'Center name must be at least 2 characters.').optional(),
    address: z.string().trim().min(5, 'Please enter a complete address.').optional(),
    city: z.string().trim().min(2, 'Please enter a valid city.').optional(),
    pincode: pincodeField.optional(),
    contact_email: z
      .string()
      .email('Please enter a valid email address.')
      .transform((v) => v.trim().toLowerCase())
      .optional(),
    phone: phoneField.optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must not exceed 1000 characters.')
      .transform((v) => (v === '' ? null : v))
      .optional()
      .nullable(),
    latitude: latitudeField.optional().nullable(),
    longitude: longitudeField.optional().nullable(),
  })
  .strict(); // .strict() makes Zod reject unknown keys

// ── Animal status filter query ─────────────────────────────────────────────────
const VALID_ANIMAL_STATUSES = ['available', 'pending_pickup', 'adopted', 'removed', 'all'];

const listAnimalsQuerySchema = z.object({
  status: z.enum(['available', 'pending_pickup', 'adopted', 'removed', 'all']).optional(),
});

// ── POST /api/center/animals (create) ─────────────────────────────────────────
// Text fields only (photo is separate via multer).
// Strict: any unexpected field → 400 naming the field.
const createAnimalSchema = z
  .object({
    name: z
      .string({ required_error: 'Animal name is required.' })
      .trim()
      .min(1, 'Animal name is required.')
      .max(60, 'Name must not exceed 60 characters.'),
    category: z.enum(['dog', 'cat', 'other'], {
      required_error: 'Category is required.',
      invalid_type_error: 'Category must be "dog", "cat", or "other".',
      message: 'Category must be "dog", "cat", or "other".',
    }),
    breed: z
      .string({ required_error: 'Breed is required.' })
      .trim()
      .min(1, 'Breed is required.')
      .max(60, 'Breed must not exceed 60 characters.'),
    age_months: z.preprocess(
      (v) => {
        // Multipart sends text; convert to integer carefully
        if (typeof v === 'string') {
          const n = parseInt(v, 10);
          return isNaN(n) ? v : n; // keep original if parse fails so Zod rejects it
        }
        return v;
      },
      z
        .number({ required_error: 'Age in months is required.', invalid_type_error: 'Age must be a whole number.' })
        .int('Age must be a whole number.')
        .min(0, 'Age cannot be negative.')
        .max(360, 'Age cannot exceed 360 months.')
    ),
    gender: z.enum(['male', 'female'], {
      required_error: 'Gender is required.',
      invalid_type_error: 'Gender must be "male" or "female".',
      message: 'Gender must be "male" or "female".',
    }),
    size: z.enum(['small', 'medium', 'large'], {
      required_error: 'Size is required.',
      invalid_type_error: 'Size must be "small", "medium", or "large".',
      message: 'Size must be "small", "medium", or "large".',
    }),
    good_with_kids: z.preprocess(
      (v) => (v === 'true' ? true : v === 'false' ? false : v),
      z.boolean().optional().default(false)
    ),
    good_with_pets: z.preprocess(
      (v) => (v === 'true' ? true : v === 'false' ? false : v),
      z.boolean().optional().default(false)
    ),
    vaccinated: z.preprocess(
      (v) => (v === 'true' ? true : v === 'false' ? false : v),
      z.boolean().optional().default(false)
    ),
    neutered: z.preprocess(
      (v) => (v === 'true' ? true : v === 'false' ? false : v),
      z.boolean().optional().default(false)
    ),
    description: z
      .string({ required_error: 'Description is required.' })
      .trim()
      .min(10, 'Description must be at least 10 characters.')
      .max(2000, 'Description must not exceed 2000 characters.'),
    story: z
      .string()
      .trim()
      .max(3000, 'Story must not exceed 3000 characters.')
      .transform((v) => (v === '' ? null : v))
      .optional()
      .nullable(),
  })
  .strict(); // unknown fields (center_id, status, id, etc.) → 400

// ── PATCH /api/center/animals/:id (update) ────────────────────────────────────
// JSON body, strict partial of the same text fields.
// Never status, never center_id, never photo fields.
const updateAnimalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Animal name is required.')
      .max(60, 'Name must not exceed 60 characters.')
      .optional(),
    category: z
      .enum(['dog', 'cat', 'other'], {
        invalid_type_error: 'Category must be "dog", "cat", or "other".',
        message: 'Category must be "dog", "cat", or "other".',
      })
      .optional(),
    breed: z
      .string()
      .trim()
      .min(1, 'Breed is required.')
      .max(60, 'Breed must not exceed 60 characters.')
      .optional(),
    age_months: z
      .number({ invalid_type_error: 'Age must be a whole number.' })
      .int('Age must be a whole number.')
      .min(0, 'Age cannot be negative.')
      .max(360, 'Age cannot exceed 360 months.')
      .optional(),
    gender: z
      .enum(['male', 'female'], {
        invalid_type_error: 'Gender must be "male" or "female".',
        message: 'Gender must be "male" or "female".',
      })
      .optional(),
    size: z
      .enum(['small', 'medium', 'large'], {
        invalid_type_error: 'Size must be "small", "medium", or "large".',
        message: 'Size must be "small", "medium", or "large".',
      })
      .optional(),
    good_with_kids: z.boolean().optional(),
    good_with_pets: z.boolean().optional(),
    vaccinated: z.boolean().optional(),
    neutered: z.boolean().optional(),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters.')
      .max(2000, 'Description must not exceed 2000 characters.')
      .optional(),
    story: z
      .string()
      .trim()
      .max(3000, 'Story must not exceed 3000 characters.')
      .transform((v) => (v === '' ? null : v))
      .optional()
      .nullable(),
  })
  .strict(); // unknown fields → 400

// ── PATCH /api/center/animals/:id/status ──────────────────────────────────────
const updateAnimalStatusSchema = z.object({
  status: z.enum(['adopted', 'available'], {
    required_error: 'Status is required.',
    invalid_type_error: 'Status must be "adopted" or "available".',
    message: 'Status must be "adopted" or "available".',
  }),
});

module.exports = {
  uuidParam,
  updateCenterSchema,
  listAnimalsQuerySchema,
  createAnimalSchema,
  updateAnimalSchema,
  updateAnimalStatusSchema,
  VALID_ANIMAL_STATUSES,
};
