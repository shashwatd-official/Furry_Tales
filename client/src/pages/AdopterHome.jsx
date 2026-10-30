import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdopterLayout from '../components/AdopterLayout';

/**
 * ImageWithFallback — renders an image and gracefully falls back to a soft sage/blush paw block
 * if the image fails to load or cannot be found.
 */
function ImageWithFallback({ src, alt, className, style, loading = 'lazy' }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`bg-accent-blush/40 flex items-center justify-center text-accent-sage ${className}`}
        style={style}
        aria-hidden="true"
      >
        <span className="text-4xl select-none">🐾</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      style={style}
      onError={() => setError(true)}
    />
  );
}

export default function AdopterHome() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Home | Furry Tales';
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'friend';

  const categories = [
    {
      name: 'Dogs',
      to: '/animals?category=dog',
      img: '/images/dogs.jpg',
      desc: 'Playful companions, loyal protectors, and joyful family pets.',
    },
    {
      name: 'Cats',
      to: '/animals?category=cat',
      img: '/images/cats.jpg',
      desc: 'Gentle purrs, independent spirits, and affectionate lap buddies.',
    },
    {
      name: 'Other Pets',
      to: '/animals?category=other',
      img: '/images/other.jpg',
      desc: 'Rabbits, birds, and small sweet creatures looking for care.',
    },
  ];

  return (
    <AdopterLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-16">
        {/* ── Hero Section ─────────────────────────────────────────────────── */}
        <section aria-labelledby="hero-heading" className="bg-white rounded-card-lg border border-border shadow-soft overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
            <div className="md:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary mb-3">
                Hello, {firstName} 🐾
              </span>
              <h1
                id="hero-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading text-main leading-tight tracking-tight mb-4"
              >
                Find your new best friend today.
              </h1>
              <p className="text-muted text-base sm:text-lg mb-8 leading-relaxed max-w-xl">
                Verified rescue centers nearby are caring for gentle, wonderful animals ready to join a loving home.
              </p>
              <div>
                <Link
                  to="/animals"
                  id="hero-find-companion-btn"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-primary text-white font-bold text-base shadow-sm hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors min-h-[44px]"
                >
                  Find Your Companion
                </Link>
              </div>
            </div>
            <div className="md:col-span-5 relative min-h-[260px] md:min-h-full">
              <ImageWithFallback
                src="/images/hero.jpg"
                alt=""
                loading="eager"
                className="w-full h-full object-cover"
                style={{ aspectRatio: '4/3' }}
              />
            </div>
          </div>
        </section>

        {/* ── Category Cards ───────────────────────────────────────────────── */}
        <section aria-labelledby="categories-heading" className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 id="categories-heading" className="text-2xl sm:text-3xl font-extrabold font-heading text-main">
              Explore by category
            </h2>
            <p className="text-muted text-sm mt-1">
              Find dogs, cats, and small animals waiting for adoption near you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={cat.to}
                id={`category-card-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group bg-white rounded-card border border-border shadow-soft hover:shadow-soft-hover hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:hover:transform-none"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-accent-blush/20">
                  <ImageWithFallback
                    src={cat.img}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-heading font-extrabold text-xl text-main group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-muted text-sm mt-1 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                  <span className="text-primary font-bold text-sm inline-flex items-center gap-1 mt-4">
                    Browse {cat.name} <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── How It Works Strip ───────────────────────────────────────────── */}
        <section aria-labelledby="how-it-works-heading" className="bg-card rounded-card border border-border p-8 sm:p-10 shadow-soft">
          <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-extrabold font-heading text-main text-center mb-8">
            How adoption works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="flex flex-col items-center sm:items-start space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent-blush/60 text-primary font-extrabold flex items-center justify-center text-lg font-heading shadow-sm" aria-hidden="true">
                1
              </div>
              <h3 className="font-heading font-bold text-lg text-main">
                Browse animals near you
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Explore profiles of available dogs, cats, and other pets, sorted by distance to your location.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent-sage/40 text-main font-extrabold flex items-center justify-center text-lg font-heading shadow-sm" aria-hidden="true">
                2
              </div>
              <h3 className="font-heading font-bold text-lg text-main">
                Apply online
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Submit an adoption application directly to the approved rescue center caring for the animal.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent-blush/60 text-primary font-extrabold flex items-center justify-center text-lg font-heading shadow-sm" aria-hidden="true">
                3
              </div>
              <h3 className="font-heading font-bold text-lg text-main">
                Meet your companion & take them home
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Connect with the shelter, meet your new pet, and complete the adoption with personalized care guidance.
              </p>
            </div>
          </div>
        </section>

        {/* ── Food Store Coming Soon Card ──────────────────────────────────── */}
        <section aria-labelledby="food-store-heading">
          <div
            id="food-store-card"
            className="rounded-card border-2 border-dashed border-border bg-white/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-90"
            aria-disabled="true"
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <span className="text-4xl select-none" aria-hidden="true">🥣</span>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 id="food-store-heading" className="text-xl font-bold font-heading text-main">
                    Furry Tales Food & Care Store
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-blush text-primary border border-primary/20">
                    Coming soon
                  </span>
                </div>
                <p className="text-muted text-sm mt-1">
                  Quality nutrition and essential pet supplies, delivered right to your doorstep to support your new family member.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-muted bg-background px-4 py-2 rounded-lg border border-border whitespace-nowrap cursor-not-allowed select-none">
              Coming in later phases
            </span>
          </div>
        </section>
      </div>
    </AdopterLayout>
  );
}
