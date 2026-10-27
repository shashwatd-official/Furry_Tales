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

module.exports = { uploadVerificationDoc };
