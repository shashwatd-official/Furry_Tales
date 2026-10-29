const sharp = require('sharp');

/**
 * Re-encode an image buffer to WebP using sharp.
 *
 * Rules:
 * - Auto-rotate from EXIF metadata so the image is always right-way-up.
 * - Resize so the longest side is at most 1600 px (never upscale).
 * - Strip all metadata (EXIF, GPS, ICC profile, etc.).
 * - Output WebP at quality 80.
 *
 * @param {Buffer} inputBuffer - raw file buffer
 * @returns {Promise<Buffer>} re-encoded WebP buffer
 */
async function reencodeToWebp(inputBuffer) {
  return sharp(inputBuffer)
    .rotate()                        // auto-rotate from EXIF
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',                 // keep aspect ratio, fit within 1600x1600
      withoutEnlargement: true,      // never upscale
    })
    .withMetadata(false)             // strip all metadata
    .webp({ quality: 80 })
    .toBuffer();
}

module.exports = { reencodeToWebp };
