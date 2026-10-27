const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { fromBuffer } = require('file-type');

const prisma = require('../config/db');
const { geocodePincode } = require('../utils/geocode');
const { uploadVerificationDoc } = require('../utils/storage');
const {
  signupAdopterSchema,
  signupCenterSchema,
  loginSchema,
} = require('../validators/auth.validators');

const SALT_ROUNDS = 12;
const COOKIE_NAME = 'auth_token';

// Allowed MIME types for verification documents
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Build the auth cookie options based on NODE_ENV.
 */
function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'Strict' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
}

/**
 * Strip password_hash from a user object before sending to client.
 */
function safeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// ─── POST /api/auth/signup/adopter ───────────────────────────────────────────
async function signupAdopter(req, res) {
  // 1. Validate body
  const parsed = signupAdopterSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(' ');
    return res.status(400).json({ error: msg });
  }
  const { name, email, password, phone, city, pincode, latitude, longitude } = parsed.data;

  // 2. Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // 3. Hash password
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // 4. Geocode pincode (silent on failure)
  let coords = { latitude: latitude ?? null, longitude: longitude ?? null };
  if (pincode && coords.latitude === null) {
    const geo = await geocodePincode(pincode);
    if (geo) coords = geo;
  }

  // 5. Create user – role is always adopter (never from body)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      role: 'adopter',
      phone: phone ?? null,
      city: city ?? null,
      pincode: pincode ?? null,
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
  });

  // 6. Issue JWT and set cookie
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return res.status(201).json({ user: safeUser(user) });
}

// ─── POST /api/auth/signup/center ────────────────────────────────────────────
async function signupCenter(req, res) {
  // 1. Validate body (fields come as form-data strings because of multer)
  // Coerce numeric lat/lng from strings if present
  const rawBody = { ...req.body };
  if (rawBody.latitude !== undefined) rawBody.latitude = parseFloat(rawBody.latitude) || undefined;
  if (rawBody.longitude !== undefined) rawBody.longitude = parseFloat(rawBody.longitude) || undefined;

  const parsed = signupCenterSchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(' ');
    return res.status(400).json({ error: msg });
  }

  const {
    adminName, email, password, adminPhone,
    centerName, address, city, pincode, contactEmail, centerPhone, description,
    latitude, longitude,
  } = parsed.data;

  // 2. Validation document is required
  if (!req.file) {
    return res.status(400).json({ error: 'A verification document (PDF, JPG, or PNG) is required.' });
  }

  // 3. Check file size (multer memoryStorage doesn't enforce limits unless configured)
  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'Verification document must be 5 MB or smaller.' });
  }

  // 4. Detect REAL file type from buffer contents (ignore extension)
  const detected = await fromBuffer(req.file.buffer);
  if (!detected || !ALLOWED_DOC_TYPES.includes(detected.mime)) {
    return res.status(400).json({
      error: 'Verification document must be a PDF, JPG, or PNG file.',
    });
  }

  // 5. Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // 6. Hash password
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // 7. Geocode center pincode (silent on failure)
  let centerCoords = { latitude: latitude ?? null, longitude: longitude ?? null };
  if (pincode && centerCoords.latitude === null) {
    const geo = await geocodePincode(pincode);
    if (geo) centerCoords = geo;
  }

  // 8. Upload verification doc BEFORE transaction (upload failure = nothing saved)
  const ext = detected.ext; // real extension from file contents
  const randomName = `${randomUUID()}.${ext}`;
  let verificationDocUrl;
  try {
    verificationDocUrl = await uploadVerificationDoc(req.file.buffer, randomName, detected.mime);
  } catch (uploadErr) {
    console.error('Verification doc upload failed:', uploadErr.message);
    return res.status(500).json({
      error: 'We could not save your verification document. Please try again.',
    });
  }

  // 9. Create user + center in ONE transaction
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      // Create center first (no user FK needed on center)
      const center = await tx.center.create({
        data: {
          name: centerName,
          address,
          city,
          pincode,
          latitude: centerCoords.latitude,
          longitude: centerCoords.longitude,
          contact_email: contactEmail,
          phone: centerPhone,
          description: description ?? null,
          verification_doc_url: verificationDocUrl,
          status: 'pending',
        },
      });

      // Create user and link to center
      const createdUser = await tx.user.create({
        data: {
          name: adminName,
          email,
          password_hash,
          role: 'center_admin', // NEVER taken from body
          phone: adminPhone ?? null,
          center_id: center.id,
        },
        include: {
          center: {
            select: { id: true, name: true, status: true, rejection_reason: true },
          },
        },
      });

      return createdUser;
    });
  } catch (txErr) {
    console.error('Center signup transaction error:', txErr);
    // Unique constraint violation on email (race condition)
    if (txErr.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ error: 'Signup failed. Please try again.' });
  }

  // 10. Issue JWT and set cookie
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return res.status(201).json({ user: safeUser(user) });
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials.' });
  }
  const { email, password } = parsed.data;

  const DUMMY_HASH = '$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt.compare to prevent timing attacks that reveal valid emails
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Issue JWT
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  // Return safe user with center info if admin
  const userWithCenter = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      center: {
        select: { id: true, name: true, status: true, rejection_reason: true },
      },
    },
  });

  return res.status(200).json({ user: safeUser(userWithCenter) });
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.status(200).json({ message: 'Logged out successfully.' });
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
async function me(req, res) {
  // req.user is already loaded fresh by requireAuth middleware (no password_hash)
  const user = req.user;

  // Shape the response
  const response = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    city: user.city,
    pincode: user.pincode,
    created_at: user.created_at,
  };

  // Include center info for center admins
  if (user.role === 'center_admin' && user.center) {
    response.center = {
      id: user.center.id,
      name: user.center.name,
      status: user.center.status,
      rejection_reason: user.center.rejection_reason,
    };
  }

  return res.status(200).json({ user: response });
}

module.exports = { signupAdopter, signupCenter, login, logout, me };
