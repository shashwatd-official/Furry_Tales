import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdopterLayout from '../components/AdopterLayout';
import SetLocationBanner from '../components/SetLocationBanner';
import AnimalCard from '../components/AnimalCard';
import AnimalDetailPanel from '../components/AnimalDetailPanel';
import { getBrowseAnimals } from '../api';

const AGE_BANDS = [
  { label: 'Any age', value: 'any', min: undefined, max: undefined },
  { label: 'Under 1 year (0 - 11 mo)', value: 'under1', min: 0, max: 11 },
  { label: '1 to under 3 years (12 - 35 mo)', value: '1to3', min: 12, max: 35 },
  { label: '3 to under 8 years (36 - 95 mo)', value: '3to8', min: 36, max: 95 },
  { label: '8 years and over (96+ mo)', value: '8plus', min: 96, max: 360 },
];

export default function AnimalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [animals, setAnimals] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasLocation, setHasLocation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Layout grid measurement for inserting detail panel below the clicked row
  const gridRef = useRef(null);
  const [columns, setColumns] = useState(1);
  const cardRefs = useRef({});

  // 1. Parse active filters safely from searchParams
  const categoryParam = searchParams.get('category');
  const activeCategory = ['dog', 'cat', 'other'].includes(categoryParam) ? categoryParam : 'all';

  const ageBandParam = searchParams.get('ageBand');
  const activeAgeBand = AGE_BANDS.find((b) => b.value === ageBandParam) ? ageBandParam : 'any';

  const sizeParam = searchParams.get('size');
  const activeSize = ['small', 'medium', 'large'].includes(sizeParam) ? sizeParam : 'all';

  const genderParam = searchParams.get('gender');
  const activeGender = ['male', 'female'].includes(genderParam) ? genderParam : 'all';

  const goodWithKidsParam = searchParams.get('goodWithKids');
  const activeGoodWithKids = goodWithKidsParam === 'true';

  // Count active filters (ignoring 'all' or 'any')
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeCategory !== 'all') count++;
    if (activeAgeBand !== 'any') count++;
    if (activeSize !== 'all') count++;
    if (activeGender !== 'all') count++;
    if (activeGoodWithKids) count++;
    return count;
  }, [activeCategory, activeAgeBand, activeSize, activeGender, activeGoodWithKids]);

  // Set document title
  useEffect(() => {
    document.title = 'Find a Friend | Furry Tales';
  }, []);

  // Update URL search parameters
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === 'any' || value === false) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
    setSearchParams(next, { replace: true });
    setOffset(0);
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
    setOffset(0);
  };

  // Determine grid column count via ResizeObserver
  useEffect(() => {
    if (!gridRef.current) return;
    const updateCols = () => {
      if (!gridRef.current) return;
      const width = gridRef.current.offsetWidth;
      if (width >= 1024) setColumns(4);
      else if (width >= 768) setColumns(3);
      else if (width >= 640) setColumns(2);
      else setColumns(1);
    };

    updateCols();
    const observer = new ResizeObserver(updateCols);
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Data fetching with AbortController to prevent stale responses
  const fetchAnimalsData = useCallback(
    async (currentOffset, append = false) => {
      const controller = new AbortController();

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const bandConfig = AGE_BANDS.find((b) => b.value === activeAgeBand);

      const params = {
        limit: 24,
        offset: currentOffset,
      };

      if (activeCategory !== 'all') params.category = activeCategory;
      if (activeSize !== 'all') params.size = activeSize;
      if (activeGender !== 'all') params.gender = activeGender;
      if (activeGoodWithKids) params.goodWithKids = 'true';
      if (bandConfig?.min !== undefined) params.ageMin = bandConfig.min;
      if (bandConfig?.max !== undefined) params.ageMax = bandConfig.max;

      try {
        const res = await getBrowseAnimals(params, controller.signal);
        setAnimals((prev) => (append ? [...prev, ...res.data.animals] : res.data.animals));
        setTotal(res.data.total);
        setHasLocation(res.data.has_location);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          // Ignored cancelled request
          return;
        }
        setError('Could not load animals. Please try again.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }

      return () => controller.abort();
    },
    [activeCategory, activeAgeBand, activeSize, activeGender, activeGoodWithKids]
  );

  // Fetch whenever filters change (reset offset)
  useEffect(() => {
    setOffset(0);
    const cancelPromise = fetchAnimalsData(0, false);
    return () => {
      if (cancelPromise && typeof cancelPromise.then === 'function') {
        cancelPromise.then((abort) => abort && abort());
      }
    };
  }, [fetchAnimalsData]);

  // Load more pagination
  const handleLoadMore = () => {
    const nextOffset = offset + 24;
    setOffset(nextOffset);
    fetchAnimalsData(nextOffset, true);
  };

  // Selection toggle
  const handleSelectAnimal = (id) => {
    if (selectedAnimalId === id) {
      setSelectedAnimalId(null);
      if (cardRefs.current[id]) {
        cardRefs.current[id].focus();
      }
    } else {
      setSelectedAnimalId(id);
    }
  };

  const handleCloseDetail = () => {
    const currentId = selectedAnimalId;
    setSelectedAnimalId(null);
    if (currentId && cardRefs.current[currentId]) {
      cardRefs.current[currentId].focus();
    }
  };

  const handleAnimalUnavailable = () => {
    handleCloseDetail();
    fetchAnimalsData(0, false);
  };

  // Determine detail panel insertion position:
  // Detail panel is inserted after the last item of the row containing selectedAnimalId.
  const selectedIndex = animals.findIndex((a) => a.id === selectedAnimalId);
  const insertAfterIndex =
    selectedIndex >= 0
      ? Math.min(
          Math.ceil((selectedIndex + 1) / columns) * columns - 1,
          animals.length - 1
        )
      : -1;

  const selectedAnimal = animals.find((a) => a.id === selectedAnimalId);

  return (
    <AdopterLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Banner if adopter has no coordinates */}
        {!hasLocation && !loading && (
          <SetLocationBanner
            onLocationSaved={() => {
              fetchAnimalsData(0, false);
            }}
          />
        )}

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold font-heading text-main tracking-tight">
            Find a Friend
          </h1>
          <p className="text-muted text-sm mt-1">
            Browse verified rescue animals ready for adoption near you.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-6 overflow-x-auto" role="tablist" aria-label="Animal categories">
          {[
            { label: 'All Animals', val: 'all' },
            { label: 'Dogs', val: 'dog' },
            { label: 'Cats', val: 'cat' },
            { label: 'Other', val: 'other' },
          ].map((cat) => {
            const isActive = activeCategory === cat.val;
            return (
              <button
                key={cat.val}
                type="button"
                role="tab"
                aria-selected={isActive}
                id={`category-tab-${cat.val}`}
                onClick={() => updateFilter('category', cat.val)}
                className={[
                  'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-muted hover:text-main hover:bg-background border border-border',
                ].join(' ')}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Filters Bar & Mobile Toggle */}
        <div className="mb-6 bg-white rounded-card border border-border p-4 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted hidden sm:inline">
                Filters
              </span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary">
                  {activeFilterCount} active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  id="clear-filters-btn"
                  onClick={clearFilters}
                  className="text-xs font-bold text-primary hover:underline px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                id="mobile-filters-toggle-btn"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="sm:hidden px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-main hover:bg-background flex items-center gap-1 min-h-[44px]"
                aria-expanded={mobileFiltersOpen}
              >
                <span>{mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}</span>
                <span aria-hidden="true">{mobileFiltersOpen ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>

          {/* Filter Controls (Collapsible on mobile) */}
          <div
            className={[
              'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border mt-3',
              mobileFiltersOpen ? 'block' : 'hidden sm:grid',
            ].join(' ')}
          >
            {/* Age Band */}
            <div>
              <label htmlFor="filter-age-band" className="block text-xs font-bold text-muted mb-1">
                Age
              </label>
              <select
                id="filter-age-band"
                value={activeAgeBand}
                onChange={(e) => updateFilter('ageBand', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                {AGE_BANDS.map((band) => (
                  <option key={band.value} value={band.value}>
                    {band.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label htmlFor="filter-size" className="block text-xs font-bold text-muted mb-1">
                Size
              </label>
              <select
                id="filter-size"
                value={activeSize}
                onChange={(e) => updateFilter('size', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                <option value="all">Any size</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="filter-gender" className="block text-xs font-bold text-muted mb-1">
                Gender
              </label>
              <select
                id="filter-gender"
                value={activeGender}
                onChange={(e) => updateFilter('gender', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                <option value="all">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Good with kids Checkbox */}
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-main min-h-[44px]">
                <input
                  id="filter-good-with-kids"
                  type="checkbox"
                  checked={activeGoodWithKids}
                  onChange={(e) => updateFilter('goodWithKids', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span>Good with kids</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results summary line */}
        <div className="flex items-center justify-between mb-4 px-1 text-xs text-muted font-medium">
          {!loading && animals.length > 0 && (
            <p id="results-count-text">
              Showing {animals.length} of {total} animal{total === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-card rounded-card border border-error/30 p-8 text-center space-y-4 my-8 shadow-soft">
            <p className="text-error font-bold text-sm">{error}</p>
            <button
              type="button"
              id="retry-fetch-btn"
              onClick={() => fetchAnimalsData(0, false)}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-card border border-border overflow-hidden h-72 flex flex-col">
                <div className="aspect-[4/3] bg-gray-200"></div>
                <div className="p-4 space-y-3 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-auto"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state: No animals match current filters */}
        {!loading && !error && animals.length === 0 && activeFilterCount > 0 && (
          <div className="bg-card rounded-card border border-border p-12 text-center space-y-4 my-8 shadow-soft">
            <span className="text-4xl select-none" aria-hidden="true">🔍</span>
            <h2 className="text-xl font-heading font-extrabold text-main">
              No animals match your filters
            </h2>
            <p className="text-muted text-sm max-w-md mx-auto">
              Try broadening your criteria or resetting your filters to see more wonderful companions.
            </p>
            <button
              type="button"
              id="empty-clear-filters-btn"
              onClick={clearFilters}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Empty state: No animals exist at all in system */}
        {!loading && !error && animals.length === 0 && activeFilterCount === 0 && (
          <div className="bg-card rounded-card border border-border p-12 text-center space-y-4 my-8 shadow-soft">
            <span className="text-4xl select-none" aria-hidden="true">🐾</span>
            <h2 className="text-xl font-heading font-extrabold text-main">
              No animals are listed yet. Please check back soon.
            </h2>
            <p className="text-muted text-sm max-w-md mx-auto">
              Approved rescue centers are preparing animal profiles. New companions will be available for adoption shortly!
            </p>
          </div>
        )}

        {/* Animal Cards Grid with Inline Detail Panel */}
        {!loading && !error && animals.length > 0 && (
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start"
          >
            {animals.map((animal, idx) => {
              const isSelected = selectedAnimalId === animal.id;
              const shouldInsertPanelAfter = idx === insertAfterIndex;

              return (
                <div key={animal.id} className="contents">
                  <AnimalCard
                    animal={animal}
                    isSelected={isSelected}
                    onSelect={handleSelectAnimal}
                    panelId={`detail-panel-${animal.id}`}
                    cardRef={(el) => {
                      cardRefs.current[animal.id] = el;
                    }}
                  />

                  {shouldInsertPanelAfter && selectedAnimal && (
                    <AnimalDetailPanel
                      animalId={selectedAnimal.id}
                      listAnimal={selectedAnimal}
                      onClose={handleCloseDetail}
                      onAnimalUnavailable={handleAnimalUnavailable}
                      panelId={`detail-panel-${selectedAnimal.id}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* "Show more" button for pagination */}
        {!loading && !error && animals.length < total && (
          <div className="mt-12 text-center">
            <button
              type="button"
              id="show-more-animals-btn"
              disabled={loadingMore}
              onClick={handleLoadMore}
              className="px-8 py-3 rounded-xl border border-border bg-white text-main font-bold text-sm shadow-soft hover:bg-background hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 transition-colors min-h-[44px]"
            >
              {loadingMore ? 'Loading more companions...' : 'Show more'}
            </button>
          </div>
        )}
      </div>
    </AdopterLayout>
  );
}
