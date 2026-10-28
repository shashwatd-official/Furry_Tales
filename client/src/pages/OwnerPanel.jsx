import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  getOwnerCenters,
  approveCenter,
  rejectCenter,
  suspendCenter,
  reinstateCenter,
  getCenterDocument,
} from '../api';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export default function OwnerPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('pending');
  const [centers, setCenters] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'warning' | 'error', text }

  // Action modal state
  // modalData: { type: 'approve' | 'reject' | 'suspend' | 'reinstate', center: Object } | null
  const [modalData, setModalData] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docLoadingId, setDocLoadingId] = useState(null);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch centers & counts
  const loadCenters = useCallback(async (tabToLoad) => {
    const tab = tabToLoad || activeTab;
    setLoading(true);
    setError(null);
    try {
      const res = await getOwnerCenters(tab);
      setCenters(res.data.centers || []);
      if (res.data.counts) {
        setCounts(res.data.counts);
      }
    } catch (err) {
      console.error('Error fetching centers:', err);
      setError(err.response?.data?.error || 'Failed to load centers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadCenters(activeTab);
  }, [activeTab, loadCenters]);

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Open Document (Task 10 & 13)
  const handleViewDocument = async (center) => {
    if (!center.has_verification_doc) {
      setFeedback({ type: 'warning', text: `No verification document on file for "${center.name}".` });
      return;
    }
    setDocLoadingId(center.id);
    try {
      const res = await getCenterDocument(center.id);
      if (res.data?.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No URL returned');
      }
    } catch (err) {
      console.error('Failed to view document:', err);
      const msg = err.response?.data?.error || 'Could not load verification document. Please try again.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setDocLoadingId(null);
    }
  };

  // Open modal
  const openActionModal = (type, center) => {
    setModalData({ type, center });
    setRejectReason('');
  };

  const closeModal = () => {
    if (actionLoading) return;
    setModalData(null);
    setRejectReason('');
  };

  // Execute action (approve, reject, suspend, reinstate)
  const handleConfirmAction = async () => {
    if (!modalData) return;
    const { type, center } = modalData;

    if (type === 'reject') {
      const trimmed = rejectReason.trim();
      if (trimmed.length < 5 || trimmed.length > 500) {
        return; // validated by disabled button and inline message
      }
    }

    setActionLoading(true);
    try {
      if (type === 'approve') {
        await approveCenter(center.id);
        setFeedback({ type: 'success', text: `Center "${center.name}" has been approved.` });
      } else if (type === 'reject') {
        await rejectCenter(center.id, rejectReason.trim());
        setFeedback({ type: 'success', text: `Center "${center.name}" has been rejected.` });
      } else if (type === 'suspend') {
        await suspendCenter(center.id);
        setFeedback({ type: 'success', text: `Center "${center.name}" has been suspended.` });
      } else if (type === 'reinstate') {
        await reinstateCenter(center.id);
        setFeedback({ type: 'success', text: `Center "${center.name}" has been reinstated.` });
      }
      closeModal();
      loadCenters();
    } catch (err) {
      if (err.response?.status === 409) {
        setFeedback({
          type: 'warning',
          text: 'Someone already reviewed this center, the list has been refreshed.',
        });
        closeModal();
        loadCenters();
      } else {
        const errorMsg = err.response?.data?.error || 'An unexpected error occurred. Please try again.';
        setFeedback({ type: 'error', text: errorMsg });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg text-main flex flex-col md:flex-row font-sans">
      {/* ── Mobile Header ────────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🐾</span>
          <span className="font-heading font-extrabold text-admin-accent tracking-tight text-lg">
            Furry Tales
          </span>
          <span className="text-xs bg-admin-bg text-muted px-2 py-0.5 rounded font-mono">
            Owner
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          id="mobile-menu-toggle-btn"
          className="p-2 rounded-md hover:bg-admin-bg border border-border text-main focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-border flex flex-col justify-between
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-border hidden md:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🐾</span>
              <div>
                <h2 className="font-heading font-extrabold text-admin-accent text-lg leading-tight">
                  Furry Tales
                </h2>
                <span className="text-[11px] text-muted font-mono uppercase tracking-wider">
                  Platform Owner
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
              Management
            </div>
            <button
              onClick={() => {
                setActiveTab('pending');
                setSidebarOpen(false);
              }}
              id="sidebar-nav-centers-btn"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold bg-admin-bg text-admin-accent border border-admin-accent/20"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true">🏢</span>
                <span>Centers</span>
              </span>
              {counts.pending > 0 && (
                <span className="bg-warning text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {counts.pending}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border bg-admin-bg/40">
          <div className="mb-3 px-1">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="text-sm font-bold truncate text-main">{user?.name || user?.email}</p>
            <p className="text-[11px] text-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            id="owner-logout-btn"
            className="w-full py-2 px-3 rounded-lg border border-border bg-white text-xs font-semibold text-main hover:bg-admin-bg hover:text-error transition-colors flex items-center justify-center gap-2"
          >
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
        />
      )}

      {/* ── Main Content Area ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Bar / Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-main tracking-tight">
                Center Applications
              </h1>
              <p className="text-sm text-muted mt-1">
                Review registrations, check verification documents, and manage approval status.
              </p>
            </div>
            <button
              onClick={() => loadCenters()}
              disabled={loading}
              id="refresh-centers-btn"
              className="self-start sm:self-auto px-3.5 py-2 rounded-lg border border-border bg-white text-xs font-semibold text-main hover:bg-admin-bg transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : '↻ Refresh list'}
            </button>
          </div>

          {/* Feedback banner (Toast / Alert) */}
          {feedback && (
            <div
              className={`
                p-4 rounded-xl border flex items-center justify-between text-sm transition-all
                ${feedback.type === 'success' ? 'bg-success/10 border-success/30 text-success' : ''}
                ${feedback.type === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' : ''}
                ${feedback.type === 'error' ? 'bg-error/10 border-error/30 text-error' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">
                  {feedback.type === 'success' && '✓'}
                  {feedback.type === 'warning' && '⚠'}
                  {feedback.type === 'error' && '✕'}
                </span>
                <span>{feedback.text}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-xs font-bold underline ml-4 hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Status Tabs ────────────────────────────────────────── */}
          <div className="border-b border-border flex gap-2 overflow-x-auto pb-px">
            {TABS.map((tab) => {
              const count = counts[tab.key] || 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setFeedback(null);
                  }}
                  id={`tab-${tab.key}-btn`}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap
                    ${
                      isActive
                        ? 'border-admin-accent text-admin-accent bg-white'
                        : 'border-transparent text-muted hover:text-main hover:bg-white/50'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded-full font-bold
                      ${
                        isActive
                          ? 'bg-admin-accent text-white'
                          : 'bg-border/60 text-muted'
                      }
                    `}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Content States ────────────────────────────────────── */}
          {loading && (
            <div className="bg-white rounded-card border border-border p-12 text-center shadow-soft">
              <div className="inline-block animate-spin text-2xl mb-3" aria-hidden="true">
                ⏳
              </div>
              <p className="text-sm font-semibold text-main">Loading centers…</p>
              <p className="text-xs text-muted mt-1">Fetching latest registration updates</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-white rounded-card border border-error/20 p-8 text-center shadow-soft">
              <span className="text-3xl mb-2 block" aria-hidden="true">⚠️</span>
              <p className="text-sm font-bold text-error">{error}</p>
              <button
                onClick={() => loadCenters()}
                className="mt-4 px-4 py-2 rounded-lg bg-admin-accent text-white text-xs font-semibold hover:bg-admin-accent/90 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && centers.length === 0 && (
            <div className="bg-white rounded-card border border-border p-12 text-center shadow-soft">
              <span className="text-4xl mb-3 block" aria-hidden="true">📦</span>
              <h3 className="font-heading font-extrabold text-main text-lg">
                {activeTab === 'pending'
                  ? 'No centers waiting for review'
                  : `No ${activeTab} centers`}
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'All submitted center applications have been processed. New registrations will appear here.'
                  : `There are currently no centers with the "${activeTab}" status.`}
              </p>
            </div>
          )}

          {/* ── Centers List ──────────────────────────────────────── */}
          {!loading && !error && centers.length > 0 && (
            <div className="space-y-4">
              {centers.map((center) => (
                <div
                  key={center.id}
                  id={`center-card-${center.id}`}
                  className="bg-white rounded-card border border-border p-5 sm:p-6 shadow-soft hover:shadow-soft-hover transition-shadow flex flex-col gap-5"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-extrabold font-heading text-main">
                          {center.name}
                        </h3>
                        <span
                          className={`
                            text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border
                            ${
                              center.status === 'pending'
                                ? 'bg-warning/10 text-warning border-warning/30'
                                : center.status === 'approved'
                                ? 'bg-success/10 text-success border-success/30'
                                : center.status === 'rejected'
                                ? 'bg-error/10 text-error border-error/30'
                                : 'bg-muted/10 text-muted border-border'
                            }
                          `}
                        >
                          {center.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Submitted on {formatDate(center.created_at)}
                        {center.reviewed_at && (
                          <span> • Reviewed {formatDate(center.reviewed_at)}</span>
                        )}
                      </p>
                    </div>

                    {/* Document Button */}
                    <div>
                      {center.has_verification_doc ? (
                        <button
                          onClick={() => handleViewDocument(center)}
                          disabled={docLoadingId === center.id}
                          id={`view-doc-btn-${center.id}`}
                          className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-admin-accent/30 bg-admin-bg text-admin-accent text-xs font-semibold hover:bg-admin-accent hover:text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <span aria-hidden="true">📄</span>
                          <span>
                            {docLoadingId === center.id ? 'Generating link…' : 'View verification document'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted italic">No document attached</span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Center details & Admin details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Column 1: Center information */}
                    <div className="space-y-1.5 bg-admin-bg/40 p-3.5 rounded-xl border border-border/50">
                      <p className="font-semibold text-admin-accent uppercase tracking-wider text-[10px]">
                        Center Location & Contact
                      </p>
                      <p className="text-main">
                        <strong className="text-muted font-normal">Address: </strong>
                        {center.address}, {center.city} - {center.pincode}
                      </p>
                      <p className="text-main">
                        <strong className="text-muted font-normal">Center Email: </strong>
                        <a href={`mailto:${center.contact_email}`} className="text-primary hover:underline">
                          {center.contact_email}
                        </a>
                      </p>
                      <p className="text-main">
                        <strong className="text-muted font-normal">Center Phone: </strong>
                        {center.phone}
                      </p>
                      {center.description && (
                        <p className="text-main mt-1 border-t border-border/40 pt-1.5 leading-relaxed">
                          <strong className="text-muted font-normal">Description: </strong>
                          {center.description}
                        </p>
                      )}
                    </div>

                    {/* Column 2: Admin user information */}
                    <div className="space-y-1.5 bg-admin-bg/40 p-3.5 rounded-xl border border-border/50">
                      <p className="font-semibold text-admin-accent uppercase tracking-wider text-[10px]">
                        Admin User Account
                      </p>
                      <p className="text-main">
                        <strong className="text-muted font-normal">Name: </strong>
                        {center.admin_name || '—'}
                      </p>
                      <p className="text-main">
                        <strong className="text-muted font-normal">Email: </strong>
                        {center.admin_email ? (
                          <a href={`mailto:${center.admin_email}`} className="text-primary hover:underline">
                            {center.admin_email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </p>
                      <p className="text-main">
                        <strong className="text-muted font-normal">Phone: </strong>
                        {center.admin_phone || '—'}
                      </p>
                      {center.status === 'rejected' && center.rejection_reason && (
                        <div className="mt-2 border-t border-error/20 pt-2 text-error">
                          <strong className="font-semibold block text-[10px] uppercase tracking-wider">
                            Rejection Reason:
                          </strong>
                          <p className="mt-0.5 leading-relaxed">{center.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions (by status) */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                    {center.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openActionModal('reject', center)}
                          id={`reject-btn-${center.id}`}
                          className="px-4 py-2 rounded-lg border border-error/30 text-error bg-white hover:bg-error hover:text-white text-xs font-semibold transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => openActionModal('approve', center)}
                          id={`approve-btn-${center.id}`}
                          className="px-4 py-2 rounded-lg bg-admin-accent text-white hover:bg-admin-accent/90 text-xs font-semibold transition-colors shadow-sm"
                        >
                          Approve Center
                        </button>
                      </>
                    )}

                    {center.status === 'approved' && (
                      <button
                        onClick={() => openActionModal('suspend', center)}
                        id={`suspend-btn-${center.id}`}
                        className="px-4 py-2 rounded-lg border border-error/30 text-error bg-white hover:bg-error hover:text-white text-xs font-semibold transition-colors"
                      >
                        Suspend Center
                      </button>
                    )}

                    {center.status === 'suspended' && (
                      <button
                        onClick={() => openActionModal('reinstate', center)}
                        id={`reinstate-btn-${center.id}`}
                        className="px-4 py-2 rounded-lg bg-admin-accent text-white hover:bg-admin-accent/90 text-xs font-semibold transition-colors"
                      >
                        Reinstate Center
                      </button>
                    )}

                    {center.status === 'rejected' && (
                      <span className="text-xs text-muted italic">
                        No actions available for rejected centers
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Confirmation Modal ─────────────────────────────────────── */}
      {modalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-card-lg border border-border max-w-md w-full p-6 shadow-soft space-y-4">
            {/* Modal Title */}
            <div>
              <h3 className="font-heading font-extrabold text-lg text-main">
                {modalData.type === 'approve' && 'Approve Center'}
                {modalData.type === 'reject' && 'Reject Center Application'}
                {modalData.type === 'suspend' && 'Suspend Center'}
                {modalData.type === 'reinstate' && 'Reinstate Center'}
              </h3>
              <p className="text-xs text-muted mt-1">
                Center: <strong className="text-main">{modalData.center.name}</strong>
              </p>
            </div>

            {/* Modal Description */}
            <div className="text-xs text-muted leading-relaxed">
              {modalData.type === 'approve' && (
                <p>
                  Approving this center will grant the admin access to list animals and receive applications.
                  An approval notification email will be dispatched to{' '}
                  <strong className="text-main">{modalData.center.admin_email}</strong>.
                </p>
              )}
              {modalData.type === 'suspend' && (
                <p>
                  Suspending this center will immediately hide their animals from adopters and restrict access.
                  You can reinstate the center at any time.
                </p>
              )}
              {modalData.type === 'reinstate' && (
                <p>
                  Reinstating this center will restore their approved status and allow them to resume operations.
                </p>
              )}
              {modalData.type === 'reject' && (
                <p>
                  Please provide a clear reason for rejecting this application. This reason will be emailed to the admin
                  and displayed in their portal.
                </p>
              )}
            </div>

            {/* Reject Reason Input (Task 14) */}
            {modalData.type === 'reject' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="reject-reason-input"
                  className="block text-xs font-semibold text-main"
                >
                  Rejection Reason <span className="text-error">*</span>
                </label>
                <textarea
                  id="reject-reason-input"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. The verification document provided is illegible. Please submit a valid registration certificate."
                  className="w-full text-xs p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main"
                  maxLength={500}
                />
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={
                      rejectReason.trim().length > 0 && rejectReason.trim().length < 5
                        ? 'text-error font-semibold'
                        : 'text-muted'
                    }
                  >
                    {rejectReason.trim().length < 5
                      ? 'Minimum 5 characters required'
                      : 'Looks good'}
                  </span>
                  <span className="text-muted font-mono">
                    {rejectReason.length}/500
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={closeModal}
                disabled={actionLoading}
                id="modal-cancel-btn"
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-main hover:bg-admin-bg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={
                  actionLoading ||
                  (modalData.type === 'reject' &&
                    (rejectReason.trim().length < 5 || rejectReason.trim().length > 500))
                }
                id="modal-confirm-btn"
                className={`
                  px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 text-white
                  ${
                    modalData.type === 'reject' || modalData.type === 'suspend'
                      ? 'bg-error hover:bg-error/90'
                      : 'bg-admin-accent hover:bg-admin-accent/90'
                  }
                `}
              >
                {actionLoading ? (
                  <>
                    <span className="animate-spin inline-block" aria-hidden="true">⏳</span>
                    <span>Processing…</span>
                  </>
                ) : (
                  <span>
                    {modalData.type === 'approve' && 'Confirm Approval'}
                    {modalData.type === 'reject' && 'Confirm Rejection'}
                    {modalData.type === 'suspend' && 'Confirm Suspension'}
                    {modalData.type === 'reinstate' && 'Confirm Reinstatement'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
