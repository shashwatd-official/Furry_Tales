const prisma = require('../config/db');
const { geocodePincode } = require('../utils/geocode');
const { updateLocationSchema } = require('../validators/animals.validators');

/**
 * PATCH /api/me/location
 * Updates only the logged-in adopter's pincode, latitude, and longitude.
 * Requires auth + adopter role.
 */
async function updateMyLocation(req, res) {
  const parsed = updateLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    let msg = firstIssue.message;
    if (firstIssue.code === 'unrecognized_keys') {
      msg = `Unknown field(s) not allowed: ${firstIssue.keys.join(', ')}.`;
    }
    return res.status(400).json({ error: msg });
  }

  const { pincode, latitude, longitude } = parsed.data;

  let finalLat = latitude;
  let finalLng = longitude;

  // If lat/lng not provided manually, geocode with existing helper
  if (finalLat === undefined || finalLng === undefined) {
    const geo = await geocodePincode(pincode);
    if (!geo) {
      return res.status(400).json({
        error: "We couldn't find that pincode. Please enter your latitude and longitude manually.",
      });
    }
    finalLat = geo.latitude;
    finalLng = geo.longitude;
  }

  // Update ONLY the logged-in user's record
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      pincode,
      latitude: finalLat,
      longitude: finalLng,
    },
  });

  return res.status(200).json({ has_location: true });
}

module.exports = {
  updateMyLocation,
};
