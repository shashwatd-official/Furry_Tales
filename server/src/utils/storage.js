const { createClient } = require('@supabase/supabase-js');

// ── Shared: create a Supabase client from env ─────────────────────────────────
function getSupabaseClient() {
  const supabaseUrl = process.env.STORAGE_URL;
  const supabaseKey = process.env.STORAGE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Storage is not configured. Please contact support.');
  }

  // Extract base URL (remove path components Supabase client doesn't expect)
  const baseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');

  return createClient(baseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

// ── PRIVATE BUCKET: verification-docs ────────────────────────────────────────

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
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

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

// ── PUBLIC BUCKET: images ─────────────────────────────────────────────────────
// Used for center photos and animal photos.
// Files are publicly accessible via getPublicUrl – no signed URLs needed.
// STORAGE_KEY never leaves the server; the browser only ever sees the final public URL.

const IMAGES_BUCKET = 'images';

/**
 * Upload an image buffer to the public "images" bucket.
 *
 * @param {Buffer} buffer     - file contents (should already be re-encoded WebP)
 * @param {string} storagePath - path inside the bucket, e.g. "animals/<animalId>/uuid.webp"
 * @param {string} mimeType   - e.g. "image/webp"
 * @returns {Promise<string>} the public URL of the uploaded file
 * @throws on any storage error
 */
async function uploadPublicImage(buffer, storagePath, mimeType = 'image/webp') {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  return getPublicImageUrl(storagePath);
}

/**
 * Derive the public URL for a file already in the "images" bucket.
 * Uses getPublicUrl (no network call, no expiry, no key in URL).
 *
 * @param {string} storagePath - path inside the bucket, e.g. "animals/<id>/uuid.webp"
 * @returns {string} permanent public URL
 */
function getPublicImageUrl(storagePath) {
  const supabase = getSupabaseClient();

  const { data } = supabase.storage
    .from(IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Delete a file from the public "images" bucket. Best-effort: never throws.
 * Returns true if deletion succeeded, false otherwise.
 *
 * @param {string} storagePath - path inside the bucket, e.g. "animals/<id>/uuid.webp"
 * @returns {Promise<boolean>}
 */
async function deletePublicImage(storagePath) {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error(`[storage] Failed to delete ${storagePath}: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[storage] Error deleting ${storagePath}: ${err.message}`);
    return false;
  }
}

/**
 * Extract the storagePath (path inside the "images" bucket) from a public URL.
 * Returns null if the URL doesn't match expected Supabase public URL format.
 *
 * @param {string} publicUrl
 * @returns {string|null}
 */
function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;
  try {
    // Supabase public URL format:
    //   https://<project>.supabase.co/storage/v1/object/public/images/<storagePath>
    const marker = `/object/public/${IMAGES_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  } catch {
    return null;
  }
}

module.exports = {
  // Private bucket
  uploadVerificationDoc,
  getVerificationDocSignedUrl,
  // Public bucket
  uploadPublicImage,
  getPublicImageUrl,
  deletePublicImage,
  extractStoragePath,
  IMAGES_BUCKET,
};
