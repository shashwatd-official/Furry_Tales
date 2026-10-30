const { z } = require('zod');

// Pincode validation helper (reused rule: string, trimmed, min 3)
const pincodeSchema = z
  .string({ required_error: 'Pincode is required.' })
  .trim()
  .min(3, 'Pincode is too short.');

// GET /api/animals query validation
// All parameters are optional, empty strings/values treated as not provided.
// STRICT schema: any unknown parameter returns 400.
const emptyToUndefined = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  return val;
};

const listPublicAnimalsQuerySchema = z
  .object({
    category: z.preprocess(
      emptyToUndefined,
      z.enum(['dog', 'cat', 'other'], {
        errorMap: () => ({ message: 'Category must be dog, cat, or other.' }),
      }).optional()
    ),
    ageMin: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: 'ageMin must be a whole number between 0 and 360.' })
        .int('ageMin must be a whole number.')
        .min(0, 'ageMin cannot be negative.')
        .max(360, 'ageMin cannot exceed 360.')
        .optional()
    ),
    ageMax: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: 'ageMax must be a whole number between 0 and 360.' })
        .int('ageMax must be a whole number.')
        .min(0, 'ageMax cannot be negative.')
        .max(360, 'ageMax cannot exceed 360.')
        .optional()
    ),
    size: z.preprocess(
      emptyToUndefined,
      z.enum(['small', 'medium', 'large'], {
        errorMap: () => ({ message: 'Size must be small, medium, or large.' }),
      }).optional()
    ),
    gender: z.preprocess(
      emptyToUndefined,
      z.enum(['male', 'female'], {
        errorMap: () => ({ message: 'Gender must be male or female.' }),
      }).optional()
    ),
    goodWithKids: z.preprocess(
      emptyToUndefined,
      z.enum(['true', 'false'], {
        errorMap: () => ({ message: 'goodWithKids must be "true" or "false".' }),
      }).optional()
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: 'limit must be a whole number between 1 and 60.' })
        .int('limit must be a whole number.')
        .min(1, 'limit must be at least 1.')
        .max(60, 'limit cannot exceed 60.')
        .default(24)
    ),
    offset: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: 'offset must be a whole number between 0 and 1000.' })
        .int('offset must be a whole number.')
        .min(0, 'offset cannot be negative.')
        .max(1000, 'offset cannot exceed 1000.')
        .default(0)
    ),
  })
  .strict({
    message: 'Unknown query parameter not allowed.',
  })
  .refine(
    (data) => {
      if (data.ageMin !== undefined && data.ageMax !== undefined) {
        return data.ageMin <= data.ageMax;
      }
      return true;
    },
    {
      message: 'ageMin must not be greater than ageMax.',
      path: ['ageMin'],
    }
  );

// GET /api/animals/:id param validation
const uuidParamSchema = z
  .string()
  .uuid('Invalid animal ID.');

// PATCH /api/me/location body validation (STRICT: no extra keys like role, email, etc.)
const updateLocationSchema = z
  .object({
    pincode: pincodeSchema,
    latitude: z
      .number({ invalid_type_error: 'Latitude must be a valid number.' })
      .min(-90, 'Latitude must be between -90 and 90.')
      .max(90, 'Latitude must be between -90 and 90.')
      .optional(),
    longitude: z
      .number({ invalid_type_error: 'Longitude must be a valid number.' })
      .min(-180, 'Longitude must be between -180 and 180.')
      .max(180, 'Longitude must be between -180 and 180.')
      .optional(),
  })
  .strict({
    message: 'Unknown field not allowed in location update.',
  })
  .refine(
    (data) => {
      const hasLat = data.latitude !== undefined;
      const hasLng = data.longitude !== undefined;
      return (hasLat && hasLng) || (!hasLat && !hasLng);
    },
    {
      message: 'Latitude and longitude must be provided together.',
      path: ['latitude'],
    }
  );

module.exports = {
  listPublicAnimalsQuerySchema,
  uuidParamSchema,
  updateLocationSchema,
};
