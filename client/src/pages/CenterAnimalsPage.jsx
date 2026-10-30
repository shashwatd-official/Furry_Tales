import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';
import {
  getCenterProfile,
  getCenterAnimals,
  removeAnimal,
  updateAnimalStatus,
} from '../api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatAge(months) {
  if (months === 0) return 'Newborn';
  const yrs = Math.floor(months / 12);
  const mo = months % 12;
  const parts = [];
  if (yrs > 0) parts.push(`${yrs} yr${yrs !== 1 ? 's' : ''}`);
  if (mo > 0) parts.push(`${mo} mo`);
  return parts.join(' ');
}

const STATUS_CONFIG = {
  available: { label: 'Available', icon: '✓', color: 'bg-success/10 text-success border-success/30' },
  pending_pickup: { label: 'Pending Pickup', icon: '⏳', color: 'bg-warning/10 text-warning border-warning/30' },
  adopted: { label: 'Adopted', icon: '🏠', color: 'bg-admin-accent/10 text-admin-accent border-admin-accent/30' },
  removed: { label: 'Removed', icon: '✕', color: 'bg-border text-muted border-border' },
};

function StatusBadge({ status, animalId }) {
  const cfg = STATUS_CONFIG[status];

  if (!cfg) {
    console.warn(`[StatusBadge] Animal ${animalId || 'unknown'}: unrecognized or missing status "${status}"`);
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-error/10 text-error border-error/30">
        <span aria-hidden="true">⚠️</span>
        Unknown status
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ── Confirmation modal ─────────────────────────────────────────────────────────

function ConfirmModal({ open, title, description, confirmLabel, confirmClass, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="bg-white rounded-card-lg border border-border max-w-md w-full p-6 shadow-soft">
        <h3 className="font-heading font-extrabold text-lg text-main">{title}</h3>
        <p className="text-sm text-muted mt-2 leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-main hover:bg-admin-bg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50 ${confirmClass || 'bg-error hover:bg-error/90'}`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status filter tabs ─────────────────────────────────────────────────────────

const FILTER_TABS = [
  { value: undefined, label: 'Active' },
  { value: 'available', label: 'Available' },
  { value: 'pending_pickup', label: 'Pending Pickup' },
  { value: 'adopted', label: 'Adopted' },
  { value: 'removed', label: 'Removed' },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CenterAnimalsPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [center, setCenter] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type, text }

  // Action modal state
  const [modal, setModal] = useState(null); // { type, animal }
  const [actionLoading, setActionLoading] = useState(false);

  const centerName = user?.center?.name;

  // Load center profile + animals
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [centerRes, animalsRes] = await Promise.all([
        getCenterProfile(),
        getCenterAnimals(statusFilter),
      ]);
      setCenter(centerRes.data.center);
      setAnimals(animalsRes.data.animals || []);
    } catch (err) {
      if (err.response?.status === 403) {
        // Center may have been suspended — refresh auth
        await refresh();
        setError(err.response.data?.error || 'Access denied.');
      } else {
        setError('Failed to load animals. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, refresh]);

  useEffect(() => {
    load();
  }, [load]);

  // Profile complete check
  const profileComplete = center ? Boolean(center.description && center.photo_url) : false;
  const hasAnimals = animals.length > 0;

  // Action handlers
  async function handleRemove() {
    if (!modal) return;
    setActionLoading(true);
    try {
      await removeAnimal(modal.animal.id);
      setFeedback({ type: 'success', text: `"${modal.animal.name}" has been removed.` });
      setModal(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to remove animal.';
      if (err.response?.status === 409) {
        setFeedback({ type: 'warning', text: msg });
      } else {
        setFeedback({ type: 'error', text: msg });
      }
      setModal(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusChange(animal, newStatus) {
    setActionLoading(true);
    try {
      await updateAnimalStatus(animal.id, newStatus);
      const label = newStatus === 'adopted' ? 'marked as Adopted' : 'returned to Available';
      setFeedback({ type: 'success', text: `"${animal.name}" has been ${label}.` });
      setModal(null);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update status.';
      setFeedback({ type: 'error', text: msg });
      setModal(null);
    } finally {
      setActionLoading(false);
    }
  }

  // ── First-time checklist (no non-removed animals) ──────────────────────────
  const showChecklist = !loading && !error && !hasAnimals && statusFilter === undefined;

  return (
    <AdminLayout centerName={centerName}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-main tracking-tight">
              Animals
            </h1>
            <p className="text-sm text-muted mt-1">
              Manage your center's animal listings.
            </p>
          </div>
          <button
            onClick={() => navigate('/center/animals/new')}
            id="add-animal-btn"
            className="self-start sm:self-auto px-5 py-2.5 rounded-lg bg-admin-accent text-white text-sm font-semibold hover:bg-admin-accent/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <span aria-hidden="true">+</span>
            Add animal
          </button>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedback.type === 'success' ? 'bg-success/10 border-success/30 text-success' :
            feedback.type === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' :
            'bg-error/10 border-error/30 text-error'
          }`}>
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs underline ml-4 hover:opacity-80">Dismiss</button>
          </div>
        )}

        {/* First-time checklist */}
        {showChecklist && (
          <div className="bg-white rounded-card border border-border p-6 shadow-soft space-y-5">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-main">Get started</h2>
              <p className="text-sm text-muted mt-1">Complete these steps before adding your first animal.</p>
            </div>
            <div className="space-y-3">
              {/* Step 1: Profile */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${profileComplete ? 'border-success/30 bg-success/5' : 'border-border bg-admin-bg/40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${profileComplete ? 'bg-success text-white' : 'bg-border text-muted'}`}>
                  {profileComplete ? '✓' : '1'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main">Complete your center profile</p>
                  <p className="text-xs text-muted mt-0.5">Add a description and a photo for your center.</p>
                </div>
                {!profileComplete && (
                  <button
                    onClick={() => navigate('/center/profile')}
                    className="text-xs font-semibold text-admin-accent hover:underline flex-shrink-0"
                  >
                    Set up →
                  </button>
                )}
              </div>

              {/* Step 2: First animal */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${profileComplete ? 'border-border bg-white' : 'border-border/40 bg-admin-bg/20 opacity-60'}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-border text-muted">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main">Add your first animal</p>
                  <p className="text-xs text-muted mt-0.5">Create a listing for an animal available for adoption.</p>
                </div>
                {profileComplete && (
                  <button
                    onClick={() => navigate('/center/animals/new')}
                    className="text-xs font-semibold text-admin-accent hover:underline flex-shrink-0"
                  >
                    Add →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status filter tabs (only shown when there are animals) */}
        {!loading && !error && (hasAnimals || statusFilter !== undefined) && (
          <div className="border-b border-border flex gap-1 overflow-x-auto pb-px">
            {FILTER_TABS.map((tab) => (
              <button
                key={String(tab.value)}
                onClick={() => setStatusFilter(tab.value)}
                id={`filter-tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  statusFilter === tab.value
                    ? 'border-admin-accent text-admin-accent bg-white'
                    : 'border-transparent text-muted hover:text-main hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-card border border-border p-12 text-center shadow-soft">
            <p className="text-sm font-semibold text-main animate-pulse">Loading animals…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-card border border-error/20 p-8 text-center shadow-soft">
            <p className="text-sm font-bold text-error">{error}</p>
            <button onClick={load} className="mt-4 px-4 py-2 rounded-lg bg-admin-accent text-white text-xs font-semibold hover:bg-admin-accent/90 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Empty (with filter active) */}
        {!loading && !error && !hasAnimals && statusFilter !== undefined && (
          <div className="bg-white rounded-card border border-border p-12 text-center shadow-soft">
            <span className="text-4xl block mb-3" aria-hidden="true">📦</span>
            <p className="text-sm font-semibold text-main">No animals with this status.</p>
          </div>
        )}

        {/* Animal table (desktop) and cards (mobile) */}
        {!loading && !error && hasAnimals && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-card border border-border shadow-soft overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-admin-bg border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Photo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Age</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {animals.map((animal) => (
                    <AnimalRow
                      key={animal.id}
                      animal={animal}
                      onEdit={() => navigate(`/center/animals/${animal.id}/edit`)}
                      onRemove={() => setModal({ type: 'remove', animal })}
                      onMarkAdopted={() => setModal({ type: 'adopted', animal })}
                      onReturnAvailable={() => setModal({ type: 'available', animal })}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {animals.map((animal) => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  onEdit={() => navigate(`/center/animals/${animal.id}/edit`)}
                  onRemove={() => setModal({ type: 'remove', animal })}
                  onMarkAdopted={() => setModal({ type: 'adopted', animal })}
                  onReturnAvailable={() => setModal({ type: 'available', animal })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirm: Remove */}
      <ConfirmModal
        open={modal?.type === 'remove'}
        title="Remove animal?"
        description={`"${modal?.animal?.name}" will be hidden from adopters but kept in your records. This cannot be undone.`}
        confirmLabel="Remove"
        confirmClass="bg-error hover:bg-error/90"
        onConfirm={handleRemove}
        onCancel={() => setModal(null)}
        loading={actionLoading}
      />

      {/* Confirm: Mark as adopted */}
      <ConfirmModal
        open={modal?.type === 'adopted'}
        title="Mark as adopted?"
        description={`Confirm that "${modal?.animal?.name}" has been picked up and adopted.`}
        confirmLabel="Mark as adopted"
        confirmClass="bg-admin-accent hover:bg-admin-accent/90"
        onConfirm={() => handleStatusChange(modal.animal, 'adopted')}
        onCancel={() => setModal(null)}
        loading={actionLoading}
      />

      {/* Confirm: Return to available */}
      <ConfirmModal
        open={modal?.type === 'available'}
        title="Return to available?"
        description={`"${modal?.animal?.name}" will be listed as available again for adoption.`}
        confirmLabel="Return to available"
        confirmClass="bg-admin-accent hover:bg-admin-accent/90"
        onConfirm={() => handleStatusChange(modal.animal, 'available')}
        onCancel={() => setModal(null)}
        loading={actionLoading}
      />
    </AdminLayout>
  );
}

// ── Desktop table row ──────────────────────────────────────────────────────────

function AnimalRow({ animal, onEdit, onRemove, onMarkAdopted, onReturnAvailable }) {
  const isRemoved = animal.status === 'removed';
  const isPendingPickup = animal.status === 'pending_pickup';

  return (
    <tr className={`hover:bg-admin-bg/30 transition-colors ${isRemoved ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3">
        {animal.photo_url ? (
          <img
            src={animal.photo_url}
            alt={animal.name}
            className="w-12 h-12 rounded-lg object-cover border border-border"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-admin-bg border border-border flex items-center justify-center text-xl" aria-hidden="true">🐾</div>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-main">{animal.name}</p>
        <p className="text-xs text-muted">{animal.breed}</p>
      </td>
      <td className="px-4 py-3 capitalize text-muted">{animal.category}</td>
      <td className="px-4 py-3 text-muted">{formatAge(animal.age_months)}</td>
      <td className="px-4 py-3 capitalize text-muted">{animal.gender}</td>
      <td className="px-4 py-3 capitalize text-muted">{animal.size}</td>
      <td className="px-4 py-3">
        <StatusBadge status={animal.status} animalId={animal.id} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {!isRemoved && (
            <button
              onClick={onEdit}
              id={`edit-animal-btn-${animal.id}`}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-main hover:bg-admin-bg transition-colors"
            >
              Edit
            </button>
          )}
          {isPendingPickup && (
            <>
              <button
                onClick={onMarkAdopted}
                id={`mark-adopted-btn-${animal.id}`}
                className="px-3 py-1.5 rounded-lg bg-admin-accent text-white text-xs font-semibold hover:bg-admin-accent/90 transition-colors"
              >
                Mark adopted
              </button>
              <button
                onClick={onReturnAvailable}
                id={`return-available-btn-${animal.id}`}
                className="px-3 py-1.5 rounded-lg border border-admin-accent text-admin-accent text-xs font-semibold hover:bg-admin-bg transition-colors"
              >
                Return
              </button>
            </>
          )}
          {!isRemoved && !isPendingPickup && (
            <button
              onClick={onRemove}
              id={`remove-animal-btn-${animal.id}`}
              className="px-3 py-1.5 rounded-lg border border-error/30 text-error text-xs font-semibold hover:bg-error/5 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Mobile card ────────────────────────────────────────────────────────────────

function AnimalCard({ animal, onEdit, onRemove, onMarkAdopted, onReturnAvailable }) {
  const isRemoved = animal.status === 'removed';
  const isPendingPickup = animal.status === 'pending_pickup';

  return (
    <div className={`bg-white rounded-card border border-border shadow-soft p-4 flex gap-4 ${isRemoved ? 'opacity-60' : ''}`}>
      {animal.photo_url ? (
        <img src={animal.photo_url} alt={animal.name} className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-admin-bg border border-border flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">🐾</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-main">{animal.name}</p>
            <p className="text-xs text-muted capitalize">{animal.category} · {animal.breed}</p>
            <p className="text-xs text-muted mt-0.5">{formatAge(animal.age_months)} · {animal.gender} · {animal.size}</p>
          </div>
          <StatusBadge status={animal.status} animalId={animal.id} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {!isRemoved && (
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-main hover:bg-admin-bg transition-colors">
              Edit
            </button>
          )}
          {isPendingPickup && (
            <>
              <button onClick={onMarkAdopted} className="px-3 py-1.5 rounded-lg bg-admin-accent text-white text-xs font-semibold hover:bg-admin-accent/90 transition-colors">
                Mark adopted
              </button>
              <button onClick={onReturnAvailable} className="px-3 py-1.5 rounded-lg border border-admin-accent text-admin-accent text-xs font-semibold hover:bg-admin-bg transition-colors">
                Return
              </button>
            </>
          )}
          {!isRemoved && !isPendingPickup && (
            <button onClick={onRemove} className="px-3 py-1.5 rounded-lg border border-error/30 text-error text-xs font-semibold hover:bg-error/5 transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
