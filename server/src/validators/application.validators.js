const { z } = require('zod');

// ---------------------------------------------------------------------------
// Shared helpers — no loose coercion; strings that are only whitespace count as
// empty after trim().
// ---------------------------------------------------------------------------

/**
 * Required trimmed string. Rejects strings made entirely of spaces.
 * @param {string} label  - used in error messages
 * @param {number} min    - minimum length after trimming (default 1)
 * @param {number} max    - maximum length after trimming
 */
const trimmedString = (label, min = 1, max = 2000) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(min, `${label} must be at least ${min} character(s).`)
    .max(max, `${label} must be at most ${max} characters.`);

/**
 * Phone rule — must be a string, trimmed, min 7 chars, required.
 * Mirrors the rule used in auth validators (min 7) but is required here, not optional.
 */
const phoneSchema = z
  .string({ required_error: 'Phone number is required.' })
  .trim()
  .min(7, 'Please enter a valid phone number.');

/**
 * Email rule — valid RFC email, trimmed, lowercased, max 150.
 */
const emailSchema = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .email('Please enter a valid email address.')
  .max(150, 'Email must be at most 150 characters.')
  .transform((v) => v.toLowerCase());

/**
 * Strict integer — must already be a JS number and an integer.
 * Rejects strings like "2" (no coerce). We use z.number() + .int().
 */
const strictInt = (label, min, max) =>
  z
    .number({ required_error: `${label} is required.`, invalid_type_error: `${label} must be a whole number.` })
    .int(`${label} must be a whole number.`)
    .min(min, `${label} must be at least ${min}.`)
    .max(max, `${label} must be at most ${max}.`);

// ---------------------------------------------------------------------------
// form_data inner schema — STRICT: any unknown key returns 400 naming the key.
//
// Field names used here are the final canonical names that BOTH the server and
// the client form must use. Changing a name here requires changing it in the
// form payload (handleSubmit) and INITIAL_FORM as well.
// ---------------------------------------------------------------------------
const formDataSchema = z
  .object({
    // ── Step 1: Applicant Details ─────────────────────────────────────────
    full_name:   trimmedString('Full name', 2, 100),
    phone:       phoneSchema,
    email:       emailSchema,
    address:     trimmedString('Address', 5, 300),
    is_adult:    z.literal(true, {
      errorMap: () => ({ message: 'You must confirm you are 18 or older.' }),
    }),

    // ── Step 2: Home & Lifestyle ──────────────────────────────────────────
    home_type:   z.enum(['house', 'apartment'], {
      errorMap: () => ({ message: 'Home type must be house or apartment.' }),
    }),
    ownership:   z.enum(['owned', 'rented'], {
      errorMap: () => ({ message: 'Ownership must be owned or rented.' }),
    }),
    // landlord_permission: boolean when rented, null when owned. Cross-checked
    // by the refine below. Using z.boolean().nullable().optional() here and
    // refining to enforce the conditional requirement.
    landlord_permission: z
      .boolean({ invalid_type_error: 'Landlord permission must be a boolean.' })
      .nullable()
      .optional(),
    outdoor_space: z.boolean({
      required_error: 'Please indicate whether you have outdoor space.',
      invalid_type_error: 'Outdoor space must be a boolean.',
    }),

    // ── Step 3: Household ─────────────────────────────────────────────────
    adults_count:  strictInt('Number of adults', 1, 20),
    children:      trimmedString('Children in household', 1, 100),   // "none" or "5, 8"
    other_pets:    trimmedString('Other pets', 1, 300),              // "none" or "1 dog"

    // ── Step 4: Animal Experience ─────────────────────────────────────────
    had_pets_before: z.boolean({
      required_error: 'Please indicate whether you have had pets before.',
      invalid_type_error: 'Had pets before must be a boolean.',
    }),
    // pet_details is required and non-empty when had_pets_before is true;
    // must be null or omitted when false. Enforced by the refine below.
    pet_details: z
      .string({ invalid_type_error: 'Pet details must be a string.' })
      .trim()
      .max(300, 'Pet details must be at most 300 characters.')
      .nullable()
      .optional(),
    hours_alone:   strictInt('Hours pet would be alone', 0, 24),

    // ── Step 5: Motivation & Care ─────────────────────────────────────────
    reason:        trimmedString('Reason for adopting', 20, 1000),
    caregiver:     trimmedString('Primary caregiver', 5, 300),
    vet_commitment: z.literal(true, {
      errorMap: () => ({ message: 'You must commit to providing regular vet care.' }),
    }),

    // ── Step 6: Consent ───────────────────────────────────────────────────
    consent_visit:  z.literal(true, {
      errorMap: () => ({ message: 'You must agree to allow a home or center visit.' }),
    }),
    consent_policy: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the center's adoption policy." }),
    }),
  })
  .strict()
  // Cross-field rule 1: rented → landlord_permission must be boolean (not null/undefined)
  .refine(
    (data) => {
      if (data.ownership === 'rented') {
        return typeof data.landlord_permission === 'boolean';
      }
      return true;
    },
    {
      message: 'Landlord permission is required when your home is rented.',
      path: ['landlord_permission'],
    }
  )
  // Cross-field rule 2: owned → landlord_permission must be null or absent
  .refine(
    (data) => {
      if (data.ownership === 'owned') {
        return data.landlord_permission === null || data.landlord_permission === undefined;
      }
      return true;
    },
    {
      message: 'Landlord permission must be null when you own your home.',
      path: ['landlord_permission'],
    }
  )
  // Cross-field rule 3: had_pets_before true → pet_details required non-empty
  .refine(
    (data) => {
      if (data.had_pets_before === true) {
        return typeof data.pet_details === 'string' && data.pet_details.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Please describe the pets you have had before.',
      path: ['pet_details'],
    }
  );

// ---------------------------------------------------------------------------
// Top-level POST /api/applications body schema — STRICT.
// Only two keys: animal_id (UUID) and form_data (object).
// ---------------------------------------------------------------------------
const submitApplicationSchema = z
  .object({
    animal_id: z
      .string({ required_error: 'animal_id is required.' })
      .uuid('Invalid animal ID.'),
    form_data: formDataSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// UUID param — reused for :id in cancel route
// ---------------------------------------------------------------------------
const uuidParamSchema = z.string().uuid('Invalid application ID.');

module.exports = {
  submitApplicationSchema,
  uuidParamSchema,
  formDataSchema,      // exported for tests
  phoneSchema,         // exported for tests
};
