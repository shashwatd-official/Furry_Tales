const { z } = require('zod');

// Allowed status values for filtering centers in the owner panel
const listCentersQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).default('pending'),
});

// UUID parameter schema
const centerIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid center ID.' }),
});

// Reject body: reason required, trimmed, 5 to 500 characters
const rejectBodySchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required.' })
    .trim()
    .min(5, { message: 'Rejection reason must be at least 5 characters.' })
    .max(500, { message: 'Rejection reason must not exceed 500 characters.' }),
});

module.exports = {
  listCentersQuerySchema,
  centerIdParamSchema,
  rejectBodySchema,
};
