const { z } = require('zod');

// Shared helpers
const email = z
  .string({ required_error: 'Email is required.' })
  .email('Please enter a valid email address.')
  .transform((v) => v.trim().toLowerCase());

const password = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.');

const phone = z
  .string()
  .trim()
  .min(7, 'Please enter a valid phone number.')
  .optional();

const pincode = z
  .string()
  .trim()
  .min(3, 'Pincode is too short.')
  .optional();

const optionalLatLng = z.object({
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
}).optional();

// POST /api/auth/signup/adopter
const signupAdopterSchema = z.object({
  name: z.string({ required_error: 'Name is required.' }).trim().min(2, 'Name must be at least 2 characters.'),
  email,
  password,
  phone: z.string().trim().min(7, 'Please enter a valid phone number.').optional(),
  city: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  // Optional manual lat/lng override
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// POST /api/auth/signup/center  (body part – file is handled by multer)
const signupCenterSchema = z.object({
  // Admin account fields
  adminName: z.string({ required_error: 'Admin name is required.' }).trim().min(2, 'Name must be at least 2 characters.'),
  email,
  password,
  adminPhone: z.string().trim().min(7, 'Please enter a valid phone number.').optional(),

  // Center profile fields
  centerName: z.string({ required_error: 'Center name is required.' }).trim().min(2, 'Center name must be at least 2 characters.'),
  address: z.string({ required_error: 'Address is required.' }).trim().min(5, 'Please enter a complete address.'),
  city: z.string({ required_error: 'City is required.' }).trim().min(2, 'Please enter a valid city.'),
  pincode: z.string({ required_error: 'Pincode is required.' }).trim().min(3, 'Please enter a valid pincode.'),
  contactEmail: email,
  centerPhone: z.string().trim().min(7, 'Please enter a valid phone number.'),
  description: z.string().trim().optional(),

  // Optional manual lat/lng for center
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// POST /api/auth/login
const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
});

module.exports = { signupAdopterSchema, signupCenterSchema, loginSchema };
