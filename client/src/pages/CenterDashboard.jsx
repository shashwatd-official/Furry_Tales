import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── Status badge ────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending Review', color: 'bg-warning/10 text-warning border-warning/20' },
    approved: { label: 'Approved', color: 'bg-success/10 text-success border-success/20' },
    rejected: { label: 'Rejected', color: 'bg-error/10 text-error border-error/20' },
    suspended: { label: 'Suspended', color: 'bg-muted/10 text-muted border-border' },
  };
  const s = map[status] || { label: status, color: 'bg-border text-muted border-border' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${s.color}`}>
      {s.label}
    </span>
  );
}

/* ── Pending screen ──────────────────────────────────────────────── */
function PendingScreen({ centerName, onLogout }) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4" aria-hidden="true">⏳</div>
      <StatusBadge status="pending" />
      <h1 className="mt-4 text-2xl font-extrabold font-heading text-main">
        Registration under review
      </h1>
      <p className="mt-3 text-sm text-muted max-w-sm mx-auto leading-relaxed">
        <strong className="text-main">{centerName}</strong> has been submitted and is awaiting
        approval by the Furry Tales team. We'll notify you once a decision is made.
        This usually takes 1–2 business days.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-white p-5 text-left text-sm space-y-2.5">
        <p className="font-semibold text-main">What happens next?</p>
        <ol className="list-decimal list-inside text-muted space-y-1.5">
          <li>Our team reviews your submitted details and verification document.</li>
          <li>You'll receive an email once your center is approved or if we need more information.</li>
          <li>After approval, you can list animals and start receiving applications.</li>
        </ol>
      </div>
      <button
        onClick={onLogout}
        id="center-pending-logout-btn"
        className="mt-6 w-full py-2.5 px-4 rounded-lg border border-border bg-white text-sm font-semibold text-main hover:bg-admin-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/30"
      >
        Log out
      </button>
    </div>
  );
}

/* ── Rejected screen ─────────────────────────────────────────────── */
function RejectedScreen({ centerName, rejectionReason, onLogout }) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4" aria-hidden="true">✗</div>
      <StatusBadge status="rejected" />
      <h1 className="mt-4 text-2xl font-extrabold font-heading text-main">
        Registration not approved
      </h1>
      <p className="mt-2 text-sm text-muted">
        Unfortunately, <strong className="text-main">{centerName}</strong>'s registration was not approved.
      </p>
      {rejectionReason && (
        <div className="mt-4 rounded-xl border border-error/20 bg-error/5 px-5 py-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-error/70 mb-1">Reason</p>
          <p className="text-sm text-main">{rejectionReason}</p>
        </div>
      )}
      <p className="mt-4 text-sm text-muted">
        Please contact <a href="mailto:furrytales2610@gmail.com" className="text-primary underline">support@furrytales.org</a> if you believe this is an error.
      </p>
      <button
        onClick={onLogout}
        id="center-rejected-logout-btn"
        className="mt-6 w-full py-2.5 px-4 rounded-lg border border-border bg-white text-sm font-semibold text-main hover:bg-admin-bg transition-colors"
      >
        Log out
      </button>
    </div>
  );
}

/* ── Suspended screen ────────────────────────────────────────────── */
function SuspendedScreen({ centerName, onLogout }) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4" aria-hidden="true">🚫</div>
      <StatusBadge status="suspended" />
      <h1 className="mt-4 text-2xl font-extrabold font-heading text-main">
        Center suspended
      </h1>
      <p className="mt-3 text-sm text-muted max-w-sm mx-auto">
        <strong className="text-main">{centerName}</strong> has been suspended. Animal listings are
        hidden from adopters while the suspension is active. Please contact support for more information.
      </p>
      <button
        onClick={onLogout}
        id="center-suspended-logout-btn"
        className="mt-6 w-full py-2.5 px-4 rounded-lg border border-border bg-white text-sm font-semibold text-main hover:bg-admin-bg transition-colors"
      >
        Log out
      </button>
    </div>
  );
}

/* ── Dashboard placeholder ───────────────────────────────────────── */
function DashboardPlaceholder({ centerName, onLogout }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-admin-accent mb-1">Dashboard</p>
          <h1 className="text-2xl font-extrabold font-heading text-main">{centerName}</h1>
        </div>
        <button
          onClick={onLogout}
          id="center-dashboard-logout-btn"
          className="py-2 px-4 rounded-lg border border-border bg-white text-sm font-semibold text-main hover:bg-admin-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/30"
        >
          Log out
        </button>
      </div>
      <div className="rounded-xl border border-border bg-white p-8 text-center">
        <p className="text-muted text-sm">
          Full dashboard (animals, applications) comes in Phase 3. Your center is approved ✓
        </p>
      </div>
    </div>
  );
}

/* ── CenterDashboard ─────────────────────────────────────────────── */
export default function CenterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const center = user?.center;
  const status = center?.status;

  const containerClass = "min-h-screen bg-admin-bg flex flex-col items-center justify-center p-6";
  const cardClass = "bg-card rounded-card shadow-soft border border-border p-8 max-w-lg w-full";

  const renderContent = () => {
    if (status === 'pending') {
      return <PendingScreen centerName={center.name} onLogout={handleLogout} />;
    }
    if (status === 'rejected') {
      return <RejectedScreen centerName={center.name} rejectionReason={center.rejection_reason} onLogout={handleLogout} />;
    }
    if (status === 'suspended') {
      return <SuspendedScreen centerName={center.name} onLogout={handleLogout} />;
    }
    if (status === 'approved') {
      // Approved admins go to the full Animals dashboard
      navigate('/center/animals', { replace: true });
      return null;
    }
    // Fallback – shouldn't happen
    return <p className="text-muted text-sm">Unknown center status. Please log out and contact support.</p>;
  };

  return (
    <div className={containerClass}>
      <div className={cardClass}>
        {renderContent()}
      </div>
    </div>
  );
}

