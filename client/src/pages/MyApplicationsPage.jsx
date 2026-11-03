import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyApplications, cancelApplication } from '../api';
import AdopterLayout from '../components/AdopterLayout';

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: '⏳',
    color: 'bg-warning/10 text-warning border-warning/30',
    description: 'Your application is awaiting review by the center.',
  },
  approved: {
    label: 'Approved',
    icon: '✅',
    color: 'bg-success/10 text-success border-success/30',
    description: "Congratulations! Your application has been approved. Contact the center to arrange pickup.",
  },
  rejected: {
    label: 'Rejected',
    icon: '✕',
    color: 'bg-error/10 text-error border-error/30',
    description: 'Your application was not accepted at this time.',
  },
  not_selected: {
    label: 'Not selected',
    icon: '○',
    color: 'bg-border text-muted border-border',
    description: 'Another applicant was selected for this animal.',
  },
  cancelled: {
    label: 'Cancelled',
    icon: '✕',
    color: 'bg-background text-muted/60 border-border line-through',
    description: 'This application was withdrawn or cancelled.',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single Application Card
// ---------------------------------------------------------------------------
function ApplicationCard({ app, onWithdraw, withdrawingId }) {
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
  const isWithdrawing = withdrawingId === app.id;
  const canWithdraw = app.status === 'pending';
  const isApproved = app.status === 'approved';

  return (
    <article
      className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden transition-shadow hover:shadow-soft-hover"
      aria-label={`Application for ${app.animal.name}`}
    >
      <div className="flex gap-4 p-5">
        {/* Animal photo */}
        <div className="flex-shrink-0">
          {app.animal.photo_url ? (
            <img
              src={app.animal.photo_url}
              alt={app.animal.name}
              className="w-20 h-20 object-cover rounded-xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-accent-blush/30 flex items-center justify-center text-3xl" aria-hidden="true">
              🐾
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
            <div>
              <h2 className="font-heading font-extrabold text-main text-lg leading-tight">
                {app.animal.name}
              </h2>
              <p className="text-xs text-muted capitalize">{app.animal.category}</p>
            </div>
            <StatusBadge status={app.status} />
          </div>

          <p className="text-xs text-muted mb-1">
            <span className="font-semibold text-main">{app.center.name}</span>
            {app.center.city && `, ${app.center.city}`}
          </p>

          <p className="text-xs text-muted">
            Applied {formatDate(app.created_at)}
            {app.decided_at && (
              <> · Decided {formatDate(app.decided_at)}</>
            )}
          </p>

          {/* Status message */}
          <p className={`text-xs mt-2 font-medium ${app.status === 'approved' ? 'text-success' : app.status === 'rejected' || app.status === 'cancelled' ? 'text-muted' : 'text-main'}`}>
            {cfg.description}
          </p>

          {/* Admin note */}
          {app.admin_note && (
            <div className="mt-2 px-3 py-2 bg-background rounded-lg border border-border text-xs text-main italic">
              <span className="font-bold not-italic text-muted uppercase text-[10px] tracking-wider mr-1">Center note:</span>
              {app.admin_note}
            </div>
          )}

          {/* Contact details — approved only */}
          {isApproved && app.center.address && (
            <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded-xl text-xs text-main space-y-1">
              <p className="font-bold text-success uppercase tracking-wider text-[10px] mb-2">
                🏠 Center Contact Details
              </p>
              {app.center.address && (
                <p><span className="text-muted">Address:</span> {app.center.address}</p>
              )}
              {app.center.phone && (
                <p><span className="text-muted">Phone:</span>{' '}
                  <a href={`tel:${app.center.phone}`} className="text-primary font-semibold hover:underline">
                    {app.center.phone}
                  </a>
                </p>
              )}
              {app.center.contact_email && (
                <p><span className="text-muted">Email:</span>{' '}
                  <a href={`mailto:${app.center.contact_email}`} className="text-primary font-semibold hover:underline">
                    {app.center.contact_email}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw button — pending only */}
      {canWithdraw && (
        <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-background/50">
          <p className="text-xs text-muted">You can withdraw this application while it is pending.</p>
          <button
            type="button"
            id={`withdraw-btn-${app.id}`}
            disabled={isWithdrawing}
            onClick={() => onWithdraw(app.id, app.animal.name)}
            className="px-4 py-1.5 rounded-lg border border-border bg-white text-xs font-bold text-main hover:bg-error/10 hover:border-error/40 hover:text-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
          >
            {isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
          </button>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [withdrawError, setWithdrawError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyApplications();
      setApplications(res.data.applications || []);
    } catch {
      setError('Could not load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleWithdraw(id, animalName) {
    const confirmed = window.confirm(
      `Are you sure you want to withdraw your application for ${animalName}? This cannot be undone.`
    );
    if (!confirmed) return;

    setWithdrawingId(id);
    setWithdrawError(null);
    try {
      await cancelApplication(id);
      // Update locally — no need to refetch
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      );
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not withdraw application. Please try again.';
      setWithdrawError(msg);
    } finally {
      setWithdrawingId(null);
    }
  }

  // Group applications by status for display ordering
  const pending = applications.filter((a) => a.status === 'pending');
  const approved = applications.filter((a) => a.status === 'approved');
  const other = applications.filter((a) => !['pending', 'approved'].includes(a.status));
  const ordered = [...approved, ...pending, ...other];

  return (
    <AdopterLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-main mb-1">
            My Applications
          </h1>
          <p className="text-sm text-muted">
            Track all your adoption applications. Approved applications include center contact details.
          </p>
        </div>

        {/* Withdraw error */}
        {withdrawError && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-error font-semibold"
          >
            {withdrawError}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-card animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16 space-y-4">
            <p className="text-error font-semibold text-sm">{error}</p>
            <button
              type="button"
              onClick={load}
              className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && applications.length === 0 && (
          <div className="text-center py-16 space-y-5">
            <div className="text-6xl" aria-hidden="true">📋</div>
            <h2 className="font-heading text-xl font-extrabold text-main">
              No applications yet
            </h2>
            <p className="text-muted text-sm">
              Browse animals and fill out an adoption form to get started.
            </p>
            <Link
              to="/animals"
              className="inline-block px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors"
            >
              Find a Friend
            </Link>
          </div>
        )}

        {/* Application list */}
        {!loading && !error && ordered.length > 0 && (
          <div className="space-y-4" role="list" aria-label="Your adoption applications">
            {/* Status legend */}
            <div className="flex flex-wrap gap-2 mb-6" aria-label="Application status legend">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}
                >
                  <span aria-hidden="true">{cfg.icon}</span>
                  {cfg.label}
                </span>
              ))}
            </div>

            {ordered.map((app) => (
              <div key={app.id} role="listitem">
                <ApplicationCard
                  app={app}
                  onWithdraw={handleWithdraw}
                  withdrawingId={withdrawingId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdopterLayout>
  );
}
