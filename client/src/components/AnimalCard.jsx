import { useState } from 'react';
import { formatAge, formatDistance } from '../utils/formatters';

/**
 * AnimalCard — keyboard focusable, expandable animal card.
 * Shows photo at 4:3 aspect ratio, name, age, and distance.
 * Hover lifts slightly and photo zooms gently.
 * Sibling slot reserved for Phase 6 favorites heart button (no nested interactive elements).
 */
export default function AnimalCard({
  animal,
  isSelected,
  onSelect,
  panelId,
  cardRef,
}) {
  const [photoError, setPhotoError] = useState(false);

  const formattedAge = formatAge(animal.age_months);
  const formattedDist = formatDistance(animal.distance_km);

  return (
    <div className="relative group w-full flex flex-col">
      <button
        ref={cardRef}
        type="button"
        id={`animal-card-${animal.id}`}
        aria-expanded={isSelected}
        aria-controls={panelId}
        onClick={() => onSelect(animal.id)}
        className={[
          'w-full text-left bg-white rounded-card border shadow-soft transition-all duration-200 overflow-hidden flex flex-col',
          'hover:shadow-soft-hover hover:-translate-y-1 motion-reduce:hover:transform-none motion-reduce:transition-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isSelected
            ? 'ring-2 ring-primary border-primary shadow-soft-hover'
            : 'border-border hover:border-accent-sage',
        ].join(' ')}
      >
        {/* Photo with paw fallback */}
        <div className="relative w-full aspect-[4/3] bg-accent-blush/30 overflow-hidden">
          {animal.photo_url && !photoError ? (
            <img
              src={animal.photo_url}
              alt={animal.name}
              loading="lazy"
              onError={() => setPhotoError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center bg-accent-sage/20 text-accent-sage"
              aria-label="No photo available"
            >
              <span className="text-4xl select-none" aria-hidden="true">🐾</span>
            </div>
          )}
        </div>

        {/* Card content */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-heading font-extrabold text-lg text-main group-hover:text-primary transition-colors truncate">
                {animal.name}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background border border-border text-muted capitalize shrink-0">
                {animal.category}
              </span>
            </div>

            <p className="text-sm text-muted font-medium mt-1">
              {formattedAge}
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted truncate max-w-[55%]">
              {animal.center_city || animal.center_name}
            </span>

            {formattedDist ? (
              <span className="font-bold text-primary shrink-0 flex items-center gap-1">
                <span aria-hidden="true">📍</span>
                {formattedDist}
              </span>
            ) : (
              <span className="text-muted/70 italic shrink-0">
                Distance unknown
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Sibling container for Phase 6 heart button (kept empty for now to fulfill structure) */}
      <div className="hidden" aria-hidden="true" />
    </div>
  );
}
