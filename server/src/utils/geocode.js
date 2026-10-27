/**
 * Geocode an Indian pincode to {latitude, longitude} using OpenStreetMap Nominatim.
 * Returns null silently on any error or timeout – signup must still succeed.
 *
 * Usage policy requirements met:
 *   - A descriptive User-Agent is sent as required by Nominatim ToS.
 *   - The caller enforces max-1-request-per-second between signups (Nominatim limit).
 *     At our traffic volumes this is trivially satisfied; we do not need a queue here.
 */
async function geocodePincode(pincode) {
  if (!pincode || typeof pincode !== 'string') return null;

  const encoded = encodeURIComponent(`${pincode.trim()}, India`);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FurryTales/1.0 (furrytales contact via platform)',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const { lat, lon } = data[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (isNaN(latitude) || isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch {
    clearTimeout(timeoutId);
    return null; // timeout, network error, parse error – all silent
  }
}

module.exports = { geocodePincode };
