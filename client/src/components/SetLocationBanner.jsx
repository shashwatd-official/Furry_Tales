import { useState } from 'react';
import { updateMyLocation } from '../api';

/**
 * SetLocationBanner — friendly prompt when the user has no saved coordinates.
 * Allows entering pincode, plus an optional manual lat/long override.
 * Re-fetches user location on success without GPS or browser permissions.
 */
export default function SetLocationBanner({ onLocationSaved }) {
  const [pincode, setPincode] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedPin = pincode.trim();
    if (!trimmedPin) {
      setErrorMsg('Please enter a valid pincode.');
      return;
    }

    const payload = { pincode: trimmedPin };

    if (showManualCoords && (latitude !== '' || longitude !== '')) {
      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);
      if (isNaN(latNum) || isNaN(lngNum)) {
        setErrorMsg('Please enter valid numbers for both latitude and longitude.');
        return;
      }
      payload.latitude = latNum;
      payload.longitude = lngNum;
    }

    setSubmitting(true);
    try {
      await updateMyLocation(payload);
      if (onLocationSaved) {
        onLocationSaved();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "We couldn't save your location. Please check your pincode or enter coordinates manually.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="set-location-banner"
      className="bg-accent-blush/30 border border-accent-blush rounded-card p-5 sm:p-6 mb-8 shadow-soft"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">📍</span>
            <h2 className="font-heading font-extrabold text-main text-lg">
              Set your location for distance sorting
            </h2>
          </div>
          <p className="text-muted text-sm leading-relaxed">
            We don't know your location yet, so animals are sorted alphabetically. Enter your pincode to see companions nearest to you first.
          </p>

          {errorMsg && (
            <div
              id="set-location-error"
              role="alert"
              className="mt-3 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-semibold"
            >
              {errorMsg}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="w-full md:w-auto shrink-0 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div>
              <label htmlFor="user-pincode-input" className="sr-only">
                Pincode
              </label>
              <input
                id="user-pincode-input"
                type="text"
                placeholder="Enter 6-digit pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
                className="w-full sm:w-48 px-3.5 py-2 rounded-xl border border-border bg-white text-sm text-main placeholder-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              id="save-location-btn"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 transition-colors min-h-[44px] flex items-center justify-center whitespace-nowrap"
            >
              {submitting ? 'Saving...' : 'Set Location'}
            </button>
          </div>

          <div>
            <button
              type="button"
              id="toggle-manual-coords-btn"
              onClick={() => setShowManualCoords(!showManualCoords)}
              className="text-xs text-primary hover:underline font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {showManualCoords ? 'Hide manual coordinates' : 'Enter latitude and longitude manually'}
            </button>
          </div>

          {showManualCoords && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label htmlFor="user-manual-lat" className="block text-[11px] font-semibold text-muted mb-0.5">
                  Latitude (-90 to 90)
                </label>
                <input
                  id="user-manual-lat"
                  type="number"
                  step="any"
                  placeholder="e.g. 13.0827"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="user-manual-lng" className="block text-[11px] font-semibold text-muted mb-0.5">
                  Longitude (-180 to 180)
                </label>
                <input
                  id="user-manual-lng"
                  type="number"
                  step="any"
                  placeholder="e.g. 80.2707"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
