import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCenterProfile, getCenterApplications, approveCenterApplication, rejectCenterApplication } from '../api';
import AdminLayout from '../components/AdminLayout';

// ── Status badge config ────────────────────────────────────────────────────────

const APP_STATUS_CONFIG = {
  pending:      { label: 'Pending',       icon: '⏳', color: 'bg-warning/10 text-warning border-warning/30' },
  approved:     { label: 'Approved',      icon: '✓',  color: 'bg-success/10 text-success border-success/30' },
  rejected:     { label: 'Rejected',      icon: '✕',  color: 'bg-error/10 text-error border-error/30' },
  not_selected: { label: 'Not Selected',  icon: '○',  color: 'bg-border text-muted border-border/50' },
  cancelled:    { label: 'Cancelled',     icon: '✕',  color: 'bg-border text-muted/60 border-border' },
};

const ANIMAL_STATUS_CONFIG = {
  available:     { label: 'Available',       color: 'bg-success/10 text-success border-success/30' },
  pending_pickup:{ label: 'Pending Pickup',  color: 'bg-warning/10 text-warning border-warning/30' },
  adopted:       { label: 'Adopted',         color: 'bg-admin-accent/10 text-admin-accent border-admin-accent/30' },
  removed:       { label: 'Removed',         color: 'bg-border text-muted border-border' },
};

function AppStatusBadge({ status }) {
  const cfg = APP_STATUS_CONFIG[status] || { label: status, icon: '?', color: 'bg-border text-muted border-border' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function AnimalStatusBadge({ status }) {
  const cfg = ANIMAL_STATUS_CONFIG[status] || { label: status, color: 'bg-border text-muted border-border' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      Animal: {cfg.label}
    </span>
  );
}

// ── Tab config ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'pending',      label: 'Pending' },
  { key: 'approved',     label: 'Approved' },
  { key: 'rejected',     label: 'Rejected' },
  { key: 'not_selected', label: 'Not Selected' },
  { key: 'cancelled',    label: 'Cancelled' },
  { key: 'all',          label: 'All' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function yesNo(val) {
  if (val === true) return 'Yes';
  if (val === false) return 'No';
  return 'Not provided';
}

function safe(val) {
  if (val === null || val === undefined || val === '') return 'Not provided';
  return String(val);
}

function HomeTypeLabel(val) {
  if (val === 'house') return 'House';
  if (val === 'apartment') return 'Apartment';
  return safe(val);
}

function OwnershipLabel(val) {
  if (val === 'owned') return 'Owned';
  if (val === 'rented') return 'Rented';
  return safe(val);
}

// ── Form sections display ──────────────────────────────────────────────────────

function FormField({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-sm text-main">{value}</span>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-bold text-admin-accent uppercase tracking-widest mb-2 pb-1 border-b border-border">{title}</h4>
      <div>{children}</div>
    </div>
  );
}

function ApplicationFormDisplay({ formData }) {
  if (!formData || typeof formData !== 'object') {
    return <p className="text-sm text-muted italic">Form data not available.</p>;
  }
  const fd = formData;
  return (
    <div>
      <FormSection title="Applicant Details">
        <FormField label="Full name" value={safe(fd.full_name)} />
        <FormField label="Phone" value={safe(fd.phone)} />
        <FormField label="Email" value={safe(fd.email)} />
        <FormField label="Address" value={safe(fd.address)} />
        <FormField label="Age 18+ confirmed" value={yesNo(fd.is_adult)} />
      </FormSection>
      <FormSection title="Home &amp; Lifestyle">
        <FormField label="Home type" value={HomeTypeLabel(fd.home_type)} />
        <FormField label="Ownership" value={OwnershipLabel(fd.ownership)} />
        {fd.ownership === 'rented' && (
          <FormField label="Landlord permits pets" value={fd.landlord_permission === null || fd.landlord_permission === undefined ? 'Not provided' : yesNo(fd.landlord_permission)} />
        )}
        <FormField label="Outdoor space" value={yesNo(fd.outdoor_space)} />
      </FormSection>
      <FormSection title="Household">
        <FormField label="Adults in household" value={safe(fd.adults_count)} />
        <FormField label="Children" value={safe(fd.children)} />
        <FormField label="Other pets" value={safe(fd.other_pets)} />
      </FormSection>
      <FormSection title="Animal Experience">
        <FormField label="Had pets before" value={yesNo(fd.had_pets_before)} />
        {fd.had_pets_before === true && (
          <FormField label="Previous pets" value={safe(fd.pet_details)} />
        )}
        <FormField label="Hours alone daily" value={fd.hours_alone !== null && fd.hours_alone !== undefined ? String(fd.hours_alone) + ' hrs' : 'Not provided'} />
      </FormSection>
      <FormSection title="Motivation &amp; Care">
        <FormField label="Reason for adopting" value={safe(fd.reason)} />
        <FormField label="Primary caregiver" value={safe(fd.caregiver)} />
        <FormField label="Vet care commitment" value={yesNo(fd.vet_commitment)} />
      </FormSection>
      <FormSection title="Consent">
        <FormField label="Agrees to home/center visit" value={yesNo(fd.consent_visit)} />
        <FormField label="Agrees to adoption policy" value={yesNo(fd.consent_policy)} />
      </FormSection>
    </div>
  );
}

// ── Focus trap for dialogs ─────────────────────────────────────────────────────

function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    function onKey(e) {
      if (e.key === 'Escape') {
        // The dialog's onClose handles this
        el.dispatchEvent(new CustomEvent('dialog-escape'));
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, ref]);
}

// ── Note dialog (approve or reject) ───────────────────────────────────────────

function NoteDialog({ open, mode, application, onClose, onConfirm, loading }) {
  const [note, setNote] = useState('');
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  useEffect(() => {
    if (!dialogRef.current) return;
    const handler = () => onClose();
    dialogRef.current.addEventListener('dialog-escape', handler);
    return () => dialogRef.current?.removeEventListener('dialog-escape', handler);
  }, [open, onClose]);

  if (!open || !application) return null;

  const isApprove = mode === 'approve';
  const otherCount = application.competing_pending_count || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-dialog-title"
    >
      <div ref={dialogRef} className="bg-white rounded-card-lg border border-border max-w-lg w-full p-6 shadow-soft">
        <h3 id="note-dialog-title" className="font-heading font-extrabold text-lg text-main mb-3">
          {isApprove ? '✓ Approve Application' : '✕ Reject Application'}
        </h3>

        {isApprove ? (
          <div className="text-sm text-muted space-y-2 mb-4 p-3 bg-warning/5 border border-warning/20 rounded-lg">
            <p>
              <strong className="text-main">{application.animal?.name}</strong> will be reserved
              as <span className="font-semibold text-warning">Pending Pickup</span> and will no longer
              appear in adoption results.
            </p>
            {otherCount > 0 ? (
              <p>
                <span className="font-semibold text-main">{otherCount}</span> other pending application{otherCount !== 1 ? 's' : ''} for
                this animal will be marked <span className="font-semibold">Not Selected</span> and those applicants will be emailed.
              </p>
            ) : (
              <p>There are no other pending applications for this animal.</p>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted mb-4 p-3 bg-error/5 border border-error/20 rounded-lg">
            <p>The applicant will be emailed to let them know their application was not successful. The animal remains available.</p>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="admin-note" className="block text-sm font-semibold text-main mb-1">
            Note to applicant <span className="text-muted font-normal">(optional, max 500 characters)</span>
          </label>
          <textarea
            id="admin-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={3}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm text-main focus:outline-none focus:ring-2 focus:ring-admin-accent/40 focus:border-admin-accent resize-none"
            placeholder={isApprove ? 'e.g. We look forward to meeting you!' : 'e.g. We found a better match for this animal.'}
            disabled={loading}
          />
          <p className="text-xs text-muted mt-1 text-right">{note.length}/500</p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-main hover:bg-admin-bg transition-colors disabled:opacity-50 min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            disabled={loading}
            className={`px-5 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] flex items-center gap-2 ${
              isApprove
                ? 'bg-success hover:bg-success/90'
                : 'bg-error hover:bg-error/90'
            }`}
          >
            {loading && <span className="animate-spin text-sm" aria-hidden="true">⏳</span>}
            {isApprove ? 'Approve application' : 'Reject application'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review panel (application detail) ─────────────────────────────────────────

function ReviewPanel({ application, onClose, onApprove, onReject }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelRef.current) return;
    panelRef.current.scrollTop = 0;
  }, [application?.id]);

  if (!application) return null;

  const fd = application.form_data || {};
  const animal = application.animal || {};
  const isPending = application.status === 'pending';

  return (
    <div
      ref={panelRef}
      className="h-full overflow-y-auto bg-white border-l border-border flex flex-col"
      role="region"
      aria-label="Application review"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between gap-3 z-10">
        <div>
          <p className="text-xs text-muted font-semibold uppercase tracking-wide">Application Review</p>
          <p className="font-heading font-bold text-main text-base leading-tight mt-0.5">
            {safe(fd.full_name)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg border border-border hover:bg-admin-bg text-muted hover:text-main transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Close review panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 flex-1">
        {/* Animal summary */}
        <div className="flex items-center gap-3 p-3 bg-admin-bg rounded-xl border border-border">
          {animal.photo_url ? (
            <img src={animal.photo_url} alt={animal.name} className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-border/50 border border-border flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">🐾</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-main text-sm">{safe(animal.name)}</p>
            <p className="text-xs text-muted capitalize">{safe(animal.category)}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <AppStatusBadge status={application.status} />
              <AnimalStatusBadge status={animal.status} />
            </div>
          </div>
        </div>

        {/* Competing count */}
        {isPending && (application.competing_pending_count || 0) > 0 && (
          <div className="text-xs font-semibold text-warning bg-warning/10 border border-warning/30 px-3 py-2 rounded-lg">
            ⚠ {application.competing_pending_count} other pending application{application.competing_pending_count !== 1 ? 's' : ''} for this animal
          </div>
        )}

        {/* Decision info (non-pending) */}
        {!isPending && (
          <div className="p-3 bg-admin-bg rounded-xl border border-border text-sm space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-muted">Decision date</span>
              <span className="font-semibold text-main">{formatDate(application.decided_at)}</span>
            </div>
            {application.admin_note && (
              <div>
                <span className="text-muted block text-xs mb-0.5">Note to applicant</span>
                <p className="text-main text-sm italic">"{application.admin_note}"</p>
              </div>
            )}
          </div>
        )}

        {/* Submission date */}
        <div className="text-xs text-muted">
          Submitted: <span className="font-semibold text-main">{formatDate(application.created_at)}</span>
        </div>

        {/* Form data */}
        <ApplicationFormDisplay formData={fd} />
      </div>

      {/* Action bar (pending only) */}
      {isPending && (
        <div className="sticky bottom-0 bg-white border-t border-border px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => onApprove(application)}
            className="flex-1 py-2.5 rounded-xl bg-success text-white text-sm font-bold hover:bg-success/90 transition-colors min-h-[44px]"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => onReject(application)}
            className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-bold hover:bg-error/90 transition-colors min-h-[44px]"
          >
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CenterApplicationsPage() {
  const { user, refresh } = useAuth();

  const [centerName, setCenterName] = useState(user?.center?.name || '');
  const [activeTab, setActiveTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type, text }

  // Review panel
  const [selectedApp, setSelectedApp] = useState(null);

  // Note dialog
  const [dialog, setDialog] = useState(null); // { mode: 'approve'|'reject', application }
  const [dialogLoading, setDialogLoading] = useState(false);

  const load = useCallback(async (tab) => {
    const statusParam = tab || activeTab;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, appsRes] = await Promise.all([
        getCenterProfile(),
        getCenterApplications(statusParam),
      ]);
      setCenterName(profileRes.data.center?.name || centerName);
      setApplications(appsRes.data.applications || []);
      setCounts(appsRes.data.counts || {});
    } catch (err) {
      if (err.response?.status === 403) {
        await refresh();
        setError(err.response?.data?.error || 'Access denied. Your center may have been suspended.');
      } else {
        setError('Failed to load applications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, centerName, refresh]);

  useEffect(() => {
    load(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSelectedApp(null);
  }

  function handleSelectApp(app) {
    setSelectedApp(app);
  }

  function handleClosePanel() {
    setSelectedApp(null);
  }

  function handleApproveClick(app) {
    setDialog({ mode: 'approve', application: app });
  }

  function handleRejectClick(app) {
    setDialog({ mode: 'reject', application: app });
  }

  async function handleDialogConfirm(note) {
    if (!dialog) return;
    setDialogLoading(true);
    const { mode, application } = dialog;
    try {
      if (mode === 'approve') {
        const res = await approveCenterApplication(application.id, note || undefined);
        const notSelected = res.data?.not_selected_count || 0;
        setFeedback({
          type: 'success',
          text: `Application approved! ${notSelected > 0 ? `${notSelected} other applicant${notSelected !== 1 ? 's' : ''} marked "Not selected" and emailed.` : ''}`,
        });
      } else {
        await rejectCenterApplication(application.id, note || undefined);
        setFeedback({ type: 'success', text: 'Application rejected. The applicant has been emailed.' });
      }
      setDialog(null);
      setSelectedApp(null);
      load(activeTab);
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        setFeedback({
          type: 'warning',
          text: 'This application was already decided, withdrawn, or the animal is no longer available. The list has been refreshed.',
        });
        setDialog(null);
        setSelectedApp(null);
        load(activeTab);
      } else if (status === 403) {
        setFeedback({
          type: 'error',
          text: 'Access denied. Your center may have been suspended.',
        });
        setDialog(null);
        await refresh();
      } else {
        setFeedback({ type: 'error', text: err.response?.data?.error || 'Something went wrong. Please try again.' });
      }
    } finally {
      setDialogLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasPanel = Boolean(selectedApp);

  return (
    <AdminLayout centerName={centerName}>
      <div className="flex h-full" style={{ minHeight: 'calc(100vh - 0px)' }}>
        {/* Left: list area */}
        <div className={`flex-1 min-w-0 flex flex-col ${hasPanel ? 'hidden lg:flex' : 'flex'}`}>
          <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-5">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-main tracking-tight">
                Applications
              </h1>
              <p className="text-sm text-muted mt-1">
                Review adoption applications for your center's animals.
              </p>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`p-4 rounded-xl border flex items-start justify-between text-sm gap-3 ${
                feedback.type === 'success' ? 'bg-success/10 border-success/30 text-success' :
                feedback.type === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' :
                'bg-error/10 border-error/30 text-error'
              }`}>
                <span>{feedback.text}</span>
                <button onClick={() => setFeedback(null)} className="text-xs underline opacity-80 hover:opacity-100 flex-shrink-0">Dismiss</button>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-border flex gap-0.5 overflow-x-auto pb-px">
              {TABS.map((tab) => {
                const count = counts[tab.key] ?? 0;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    id={`app-tab-${tab.key}`}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'border-admin-accent text-admin-accent bg-white'
                        : 'border-transparent text-muted hover:text-main hover:bg-white/50'
                    }`}
                  >
                    {tab.label}
                    {tab.key !== 'all' && count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-admin-accent/15 text-admin-accent' : 'bg-border text-muted'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading */}
            {loading && (
              <div className="bg-white rounded-card border border-border p-12 text-center shadow-soft">
                <p className="text-sm font-semibold text-main animate-pulse">Loading applications…</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="bg-white rounded-card border border-error/20 p-8 text-center shadow-soft">
                <p className="text-sm font-bold text-error">{error}</p>
                <button
                  onClick={() => load(activeTab)}
                  className="mt-4 px-4 py-2 rounded-lg bg-admin-accent text-white text-xs font-semibold hover:bg-admin-accent/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && applications.length === 0 && (
              <div className="bg-white rounded-card border border-border p-12 text-center shadow-soft">
                <span className="text-4xl block mb-3" aria-hidden="true">📋</span>
                <p className="text-sm font-semibold text-main">No applications here yet.</p>
                <p className="text-xs text-muted mt-1">
                  {activeTab === 'pending' ? 'New applications will appear here.' : 'No applications with this status.'}
                </p>
              </div>
            )}

            {/* Desktop table */}
            {!loading && !error && applications.length > 0 && (
              <>
                <div className="hidden md:block bg-white rounded-card border border-border shadow-soft overflow-hidden">
                  <table className="w-full text-sm" role="table" aria-label="Applications list">
                    <thead className="bg-admin-bg border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider w-12">Photo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Animal</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Applicant</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Submitted</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {applications.map((app) => (
                        <ApplicationRow
                          key={app.id}
                          application={app}
                          isSelected={selectedApp?.id === app.id}
                          onReview={() => handleSelectApp(app)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {applications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      isSelected={selectedApp?.id === app.id}
                      onReview={() => handleSelectApp(app)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: review panel (desktop side-by-side, mobile full-screen) */}
        {hasPanel && (
          <div className={`${hasPanel ? 'flex' : 'hidden'} flex-col lg:w-96 xl:w-[26rem] border-l border-border`}
            style={{ maxHeight: 'calc(100vh - 0px)', position: 'sticky', top: 0, height: '100vh' }}>
            <ReviewPanel
              application={selectedApp}
              onClose={handleClosePanel}
              onApprove={handleApproveClick}
              onReject={handleRejectClick}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <NoteDialog
        open={Boolean(dialog)}
        mode={dialog?.mode}
        application={dialog?.application}
        onClose={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
        loading={dialogLoading}
      />
    </AdminLayout>
  );
}

// ── Desktop table row ──────────────────────────────────────────────────────────

function ApplicationRow({ application, isSelected, onReview }) {
  const fd = application.form_data || {};
  return (
    <tr
      className={`transition-colors cursor-pointer ${
        isSelected ? 'bg-admin-accent/5' : 'hover:bg-admin-bg/40'
      }`}
      onClick={onReview}
    >
      <td className="px-4 py-3">
        {application.animal?.photo_url ? (
          <img
            src={application.animal.photo_url}
            alt={application.animal.name}
            className="w-11 h-11 rounded-lg object-cover border border-border"
          />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-admin-bg border border-border flex items-center justify-center text-lg" aria-hidden="true">🐾</div>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-main text-sm">{safe(application.animal?.name)}</p>
        <AnimalStatusBadge status={application.animal?.status} />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-main">{safe(fd.full_name)}</p>
        {application.status === 'pending' && application.competing_pending_count > 0 && (
          <span className="inline-block mt-0.5 text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
            {application.competing_pending_count} other pending
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{formatDate(application.created_at)}</td>
      <td className="px-4 py-3">
        <AppStatusBadge status={application.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onReview(); }}
          className="px-3 py-1.5 rounded-lg border border-admin-accent/40 text-admin-accent text-xs font-semibold hover:bg-admin-accent hover:text-white transition-colors min-h-[36px]"
          aria-label={`Review application from ${safe(fd.full_name)}`}
        >
          Review
        </button>
      </td>
    </tr>
  );
}

// ── Mobile card ────────────────────────────────────────────────────────────────

function ApplicationCard({ application, isSelected, onReview }) {
  const fd = application.form_data || {};
  return (
    <div
      className={`bg-white rounded-card border shadow-soft p-4 flex gap-3 cursor-pointer transition-colors ${
        isSelected ? 'border-admin-accent/40 bg-admin-accent/5' : 'border-border hover:bg-admin-bg/30'
      }`}
      onClick={onReview}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onReview(); } }}
      aria-label={`Review application from ${safe(fd.full_name)} for ${safe(application.animal?.name)}`}
    >
      {application.animal?.photo_url ? (
        <img src={application.animal.photo_url} alt={application.animal?.name} className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-admin-bg border border-border flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">🐾</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-main text-sm">{safe(application.animal?.name)}</p>
            <p className="text-xs text-muted">{safe(fd.full_name)}</p>
          </div>
          <AppStatusBadge status={application.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <AnimalStatusBadge status={application.animal?.status} />
          {application.status === 'pending' && application.competing_pending_count > 0 && (
            <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
              {application.competing_pending_count} other pending
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted">{formatDate(application.created_at)}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onReview(); }}
            className="px-3 py-1.5 rounded-lg border border-admin-accent/40 text-admin-accent text-xs font-semibold hover:bg-admin-accent hover:text-white transition-colors min-h-[36px]"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
}
