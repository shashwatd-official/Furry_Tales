const multer = require('multer');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Multer instance for image uploads.
 * - Memory storage (no temp disk writes)
 * - Max 5 MB per file, max 1 file per request
 * - Field name is enforced in the route handler via upload.single('photo')
 */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

/**
 * Wraps imageUpload.single('photo') and converts multer errors into our
 * standard { "error": "..." } JSON response. This prevents raw multer
 * errors (which expose internal details) from ever reaching the client.
 *
 * Usage in a route: router.post('/path', singlePhotoUpload, handler)
 */
function singlePhotoUpload(req, res, next) {
  imageUpload.single('photo')(req, res, (err) => {
    if (!err) return next();

    // Multer-specific errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Photo must be 5 MB or smaller.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Please upload exactly one photo in the "photo" field.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    // Unknown errors
    return next(err);
  });
}

module.exports = { singlePhotoUpload, MAX_FILE_SIZE };
