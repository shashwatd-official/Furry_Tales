import { useEffect, useState, useRef } from 'react';
import { getBrowseAnimal } from '../api';
import { formatAge, formatDistance } from '../utils/formatters';

/**
 * AnimalDetailPanel — opens directly beneath the clicked card's row.
 * Displays immediate details from card props, then asynchronously fetches GET /api/animals/:id.
 * If 404 is encountered, alerts adopter and notifies parent to refresh.
 * Accessible with Escape to close, focus return, and prefers-reduced-motion support.
 */
export default function AnimalDetailPanel({
  animalId,
  listAnimal,
  onClose,
  onAnimalUnavailable,
  panelId,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const panelRef = useRef(null);

  // Fetch full details
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getBrowseAnimal(animalId)
      .then((res) => {
        if (!active) return;
        setDetail(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) {
          setError('This animal is no longer available.');
          if (onAnimalUnavailable) {
            onAnimalUnavailable(animalId);
          }
        } else {
          setError('Could not load animal details. Please try again.');
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [animalId, onAnimalUnavailable]);

  // Keyboard navigation: Escape key closes panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Smooth scroll into view on open
  useEffect(() => {
    if (panelRef.current) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panelRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  }, [animalId]);

  // Use detail data if loaded, otherwise fall back to listAnimal summary
  const data = detail || listAnimal;
  const formattedAge = formatAge(data?.age_months);
  const formattedDist = formatDistance(data?.distance_km);

  return (
    <section
      ref={panelRef}
      id={panelId}
      aria-label={`Details for ${data?.name || 'animal'}`}
      className="col-span-full my-4 bg-white rounded-card-lg border-2 border-primary/20 shadow-soft-hover p-6 sm:p-8 transition-all duration-300 motion-reduce:transition-none"
    >
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/30">
            <span aria-hidden="true">✓</span>
            Available for adoption
          </span>
          {data?.center_city && (
            <span className="text-xs text-muted font-medium hidden sm:inline">
              at {data.center_name} ({data.center_city})
            </span>
          )}
        </div>

        <button
          type="button"
          id="close-detail-panel-btn"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-main px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
        >
          <span>View other animals</span>
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {error ? (
        <div className="p-6 text-center space-y-3">
          <p className="text-error font-semibold text-sm">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
          >
            Close panel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Photo side */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="relative aspect-[4/3] rounded-card overflow-hidden bg-accent-blush/30 border border-border">
              {data?.photo_url && !photoError ? (
                <img
                  src={data.photo_url}
                  alt={data.name}
                  loading="eager"
                  onError={() => setPhotoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center bg-accent-sage/20 text-accent-sage"
                  aria-label="No photo available"
                >
                  <span className="text-5xl select-none" aria-hidden="true">🐾</span>
                </div>
              )}
            </div>

            {/* Shelter & Distance card */}
            <div className="bg-background rounded-card p-4 border border-border flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-main">{data?.center_name}</p>
                <p className="text-muted">{data?.center_city}</p>
              </div>
              {formattedDist ? (
                <span className="font-bold text-primary flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-border">
                  <span aria-hidden="true">📍</span>
                  {formattedDist}
                </span>
              ) : (
                <span className="text-muted/70 italic">Distance unknown</span>
              )}
            </div>
          </div>

          {/* Details & Traits side */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h2 className="text-3xl font-heading font-extrabold text-main">
                  {data?.name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-blush/50 text-main border border-border capitalize">
                    {data?.category}
                  </span>
                  {detail?.breed && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-sage/30 text-main border border-border">
                      {detail.breed}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats pills */}
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted mb-4">
                <span className="bg-background px-3 py-1 rounded-lg border border-border">
                  Age: <strong className="text-main font-bold">{formattedAge}</strong>
                </span>
                <span className="bg-background px-3 py-1 rounded-lg border border-border capitalize">
                  Gender: <strong className="text-main font-bold">{data?.gender}</strong>
                </span>
                <span className="bg-background px-3 py-1 rounded-lg border border-border capitalize">
                  Size: <strong className="text-main font-bold">{data?.size}</strong>
                </span>
              </div>

              {/* Trait chips (only true traits shown) */}
              <div className="flex flex-wrap gap-2 mb-6">
                {detail?.good_with_kids && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-accent-sage/20 text-main border border-accent-sage/40">
                    <span aria-hidden="true">👶</span> Good with kids
                  </span>
                )}
                {detail?.good_with_pets && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-accent-sage/20 text-main border border-accent-sage/40">
                    <span aria-hidden="true">🐶</span> Good with other pets
                  </span>
                )}
                {detail?.vaccinated && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-accent-sage/20 text-main border border-accent-sage/40">
                    <span aria-hidden="true">💉</span> Vaccinated
                  </span>
                )}
                {detail?.neutered && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-accent-sage/20 text-main border border-accent-sage/40">
                    <span aria-hidden="true">✂️</span> Neutered / Spayed
                  </span>
                )}
              </div>

              {/* Description */}
              {loading && !detail ? (
                <div className="space-y-2 animate-pulse" aria-label="Loading extra animal details">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {detail?.description && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                        About {data?.name}
                      </h3>
                      <p className="text-sm text-main leading-relaxed whitespace-pre-wrap">
                        {detail.description}
                      </p>
                    </div>
                  )}

                  {detail?.story && (
                    <div className="p-4 rounded-xl bg-accent-blush/20 border border-accent-blush/40">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                        Their Story
                      </h3>
                      <p className="text-sm text-main leading-relaxed whitespace-pre-wrap">
                        {detail.story}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions for Phases 5 and 6 (structured for plugging real handlers later) */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
              <button
                type="button"
                id="btn-fill-adoption-form"
                disabled
                aria-disabled="true"
                className="px-6 py-2.5 rounded-xl bg-primary/40 text-white font-bold text-sm cursor-not-allowed flex items-center gap-2 min-h-[44px]"
              >
                <span>Fill adoption form</span>
                <span className="text-[10px] font-normal uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </button>

              <button
                type="button"
                id="btn-add-favorites"
                disabled
                aria-disabled="true"
                className="px-5 py-2.5 rounded-xl bg-card border border-border text-muted font-bold text-sm cursor-not-allowed flex items-center gap-2 min-h-[44px]"
              >
                <span aria-hidden="true">♡</span>
                <span>Add to favorites</span>
                <span className="text-[10px] font-normal uppercase tracking-wider bg-background px-2 py-0.5 rounded-full border border-border">
                  Coming soon
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
