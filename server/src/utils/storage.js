const { createClient } = require('@supabase/supabase-js');

/**
 * Upload a verification document buffer to the private Supabase Storage
 * bucket "verification-docs".
 *
 * Uses STORAGE_URL and STORAGE_KEY from environment.
 * The service-role key (STORAGE_KEY) NEVER leaves the server.
 *
 * @param {Buffer}  buffer    - file contents
 * @param {string}  filename  - already-randomised filename with extension
 * @param {string}  mimeType  - e.g. "application/pdf"
 * @returns {string}           storage path, e.g. "verification-docs/abc123.pdf"
 * @throws on any storage error
 */
async function uploadVerificationDoc(buffer, filename, mimeType) {
  const supabaseUrl = process.env.STORAGE_URL;
  const supabaseKey = process.env.STORAGE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Storage is not configured. Please contact support.');
  }

  // Extract base URL (remove path components Supabase client doesn't expect)
  const baseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');

  const supabase = createClient(baseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const BUCKET = 'verification-docs';
  const storagePath = filename; // path inside the bucket

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Document upload failed: ${error.message}`);
  }

  return `${BUCKET}/${storagePath}`;
}

/**
 * Creates a short-lived (60s) signed download URL for a verification document in the private bucket.
 * The storage key and internal bucket path never leave the server.
 *
 * @param {string} storagePath - e.g. "verification-docs/uuid.pdf" or "uuid.pdf"
 * @param {number} expiresInSeconds - expiry time in seconds (default 60)
 * @returns {Promise<string>} signed URL
 */
async function getVerificationDocSignedUrl(storagePath, expiresInSeconds = 60) {
  const supabaseUrl = process.env.STORAGE_URL;
  const supabaseKey = process.env.STORAGE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Storage is not configured.');
  }

  const baseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
  const supabase = createClient(baseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const BUCKET = 'verification-docs';
  // Strip bucket prefix if present in the stored path
  const filename = storagePath.startsWith(`${BUCKET}/`)
    ? storagePath.slice(BUCKET.length + 1)
    : storagePath;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filename, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown storage error'}`);
  }

  return data.signedUrl;
}

module.exports = { uploadVerificationDoc, getVerificationDocSignedUrl };
