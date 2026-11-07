'use strict';
/**
 * centerApplications.validators.js
 *
 * Zod schemas for the center admin applications endpoints.
 *
 * Rules:
 * - All schemas are STRICT: unknown keys return 400.
 * - status query values: pending | approved | rejected | not_selected | cancelled | all
 *   Default when absent = pending. Any other value is 400.
 *   Any unknown query parameter is also 400.
 * - :id param must be a valid UUID.
 * - approve / reject body: { note?: string } strict.
 *   note is trimmed; if empty after trim it becomes null.
 *   max 500 characters.
 */

const { z } = require('zod');

// ---------------------------------------------------------------------------
// Valid application statuses for the query param
// ---------------------------------------------------------------------------
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'not_selected', 'cancelled', 'all'];

/**
 * GET /api/center/applications?status=...
 * Validates the query object — strict so unknown query params are rejected.
 */
const listApplicationsQuerySchema = z
  .object({
    status: z
      .enum(VALID_STATUSES, {
        errorMap: () => ({
          message: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
        }),
      })
      .optional()
      .default('pending'),
  })
  .strict();

// ---------------------------------------------------------------------------
// UUID param — :id in approve / reject routes
// ---------------------------------------------------------------------------
const uuidParamSchema = z.string().uuid('Invalid application ID.');

// ---------------------------------------------------------------------------
// Approve / reject body: { note?: string }
// STRICT: unknown keys → 400.
// note is trimmed; empty / all-whitespace → null.
// ---------------------------------------------------------------------------
const noteBodySchema = z
  .object({
    note: z
      .string()
      .trim()
      .max(500, 'Note must be at most 500 characters.')
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional(),
  })
  .strict();

module.exports = {
  listApplicationsQuerySchema,
  uuidParamSchema,
  noteBodySchema,
  VALID_STATUSES,
};

