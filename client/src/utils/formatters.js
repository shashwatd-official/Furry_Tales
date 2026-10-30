/**
 * Formats age in months for adopter cards and panels.
 * Rule:
 *   - 0: "Under 1 month"
 *   - whole years and months: e.g. "2 yrs 3 mo", "8 mo", "1 yr", "1 yr 1 mo"
 */
export function formatAge(months) {
  if (months === null || months === undefined) return '';
  const num = Number(months);
  if (isNaN(num) || num <= 0) return 'Under 1 month';
  const yrs = Math.floor(num / 12);
  const mo = num % 12;
  const parts = [];
  if (yrs > 0) parts.push(`${yrs} yr${yrs !== 1 ? 's' : ''}`);
  if (mo > 0) parts.push(`${mo} mo`);
  return parts.join(' ');
}

/**
 * Formats distance in km:
 *   - null / undefined: null (component displays "Distance unknown")
 *   - < 1: "Under 1 km away"
 *   - < 100: "4.2 km away" (one decimal place)
 *   - >= 100: "125 km away" (whole kilometres)
 */
export function formatDistance(km) {
  if (km === null || km === undefined) return null;
  const num = Number(km);
  if (isNaN(num)) return null;
  if (num < 1) return 'Under 1 km away';
  if (num < 100) return `${num.toFixed(1)} km away`;
  return `${Math.round(num)} km away`;
}
