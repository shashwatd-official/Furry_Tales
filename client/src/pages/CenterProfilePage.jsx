import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';
import {
  getCenterProfile,
  updateCenterProfile,
  uploadCenterPhoto,
} from '../api';

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: 'bg-warning/10 text-warning border-warning/30', icon: '⏳' },
  approved: { label: 'Approved', color: 'bg-success/10 text-success border-success/30', icon: '✓' },
  rejected: { label: 'Rejected', color: 'bg-error/10 text-error border-error/30', icon: '✕' },
  suspended: { label: 'Suspended', color: 'bg-border text-muted border-border', icon: '🚫' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-border text-muted border-border', icon: '?' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.color}`}>
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ── Photo uploader ─────────────────────────────────────────────────────────────
function CenterPhotoUploader({ currentUrl, centerId, onUpdate }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  async function handleFile(file) {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be 5 MB or smaller.');
      return;
    }

    setError(null);
    setSuccess(false);
    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await uploadCenterPhoto(fd);
      onUpdate(res.data.photo_url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Please try again.';
      setError(msg);
      setPreview(currentUrl || null); // revert preview
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-main mb-2">Center Photo</label>
      {preview ? (
        <img
          src={preview}
          alt="Center photo"
          className="w-32 h-32 object-cover rounded-xl border border-border mb-3"
        />
      ) : (
        <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border bg-admin-bg flex items-center justify-center text-3xl mb-3" aria-hidden="true">
          🏢
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-lg border border-border bg-white text-sm font-semibold text-main hover:bg-admin-bg transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : preview ? 'Replace photo' : 'Upload photo'}
        </button>
        {success && <span className="text-xs text-success font-semibold">✓ Uploaded</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        id="center-photo-input"
      />
      {error && <p className="text-xs text-error mt-1.5">{error}</p>}
      <p className="text-xs text-muted mt-1.5">JPG, PNG or WebP · max 5 MB</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CenterProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const centerName = user?.center?.name;

  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [locationWarning, setLocationWarning] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    pincode: '',
    contact_email: '',
    phone: '',
    description: '',
  });

  useEffect(() => {
    getCenterProfile()
      .then((res) => {
        const c = res.data.center;
        setCenter(c);
        setForm({
          name: c.name || '',
          address: c.address || '',
          city: c.city || '',
          pincode: c.pincode || '',
          contact_email: c.contact_email || '',
          phone: c.phone || '',
          description: c.description || '',
        });
      })
      .catch(() => setError('Failed to load center profile.'))
      .finally(() => setLoading(false));
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate() {
    const errors = {};
    if (!form.name.trim() || form.name.length < 2) errors.name = 'Center name must be at least 2 characters.';
    if (!form.address.trim() || form.address.length < 5) errors.address = 'Please enter a complete address.';
    if (!form.city.trim() || form.city.length < 2) errors.city = 'Please enter a valid city.';
    if (!form.pincode.trim() || form.pincode.length < 3) errors.pincode = 'Pincode is too short.';
    if (!form.contact_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      errors.contact_email = 'Please enter a valid email address.';
    }
    if (!form.phone.trim() || form.phone.length < 7) errors.phone = 'Please enter a valid phone number.';
    if (form.description.length > 1000) errors.description = 'Description must not exceed 1000 characters.';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess(false);
    setLocationWarning(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        contact_email: form.contact_email.trim().toLowerCase(),
        phone: form.phone.trim(),
        description: form.description.trim() || null,
      };
      const res = await updateCenterProfile(payload);
      setCenter(res.data.center);
      setSuccess(true);
      if (res.data.location_warning) {
        setLocationWarning(res.data.location_warning);
      }
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save changes. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoUpdate(newUrl) {
    setCenter((prev) => prev ? { ...prev, photo_url: newUrl } : prev);
  }

  if (loading) {
    return (
      <AdminLayout centerName={centerName}>
        <div className="max-w-2xl mx-auto p-8">
          <p className="text-sm text-muted animate-pulse">Loading profile…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout centerName={centerName}>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-main tracking-tight">
              Center Profile
            </h1>
            <p className="text-sm text-muted mt-1">Update your center's public information.</p>
          </div>
          {center && <StatusBadge status={center.status} />}
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl border border-error/30 bg-error/5 text-sm text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-xl border border-success/30 bg-success/5 text-sm text-success flex items-center gap-2">
            <span aria-hidden="true">✓</span>
            Profile saved successfully.
          </div>
        )}

        {locationWarning && (
          <div className="mb-5 p-4 rounded-xl border border-warning/30 bg-warning/5 text-sm text-warning">
            <strong className="font-semibold">Location note:</strong> {locationWarning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Photo */}
          <div className="bg-white rounded-card border border-border p-5 sm:p-6 shadow-soft">
            <h2 className="font-heading font-extrabold text-base text-admin-accent mb-4">Center Photo</h2>
            {center && (
              <CenterPhotoUploader
                currentUrl={center.photo_url}
                centerId={center.id}
                onUpdate={handlePhotoUpdate}
              />
            )}
          </div>

          {/* Info */}
          <div className="bg-white rounded-card border border-border p-5 sm:p-6 shadow-soft space-y-4">
            <h2 className="font-heading font-extrabold text-base text-admin-accent">Center Information</h2>

            <div>
              <label className="block text-sm font-semibold text-main mb-1">
                Center Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.name ? 'border-error' : 'border-border'}`}
                id="center-name-input"
              />
              {fieldErrors.name && <p className="text-xs text-error mt-1">{fieldErrors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-main mb-1">
                  Contact Email <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setField('contact_email', e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.contact_email ? 'border-error' : 'border-border'}`}
                  id="center-email-input"
                />
                {fieldErrors.contact_email && <p className="text-xs text-error mt-1">{fieldErrors.contact_email}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-main mb-1">
                  Phone <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.phone ? 'border-error' : 'border-border'}`}
                  id="center-phone-input"
                />
                {fieldErrors.phone && <p className="text-xs text-error mt-1">{fieldErrors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-card border border-border p-5 sm:p-6 shadow-soft space-y-4">
            <h2 className="font-heading font-extrabold text-base text-admin-accent">Location</h2>

            <div>
              <label className="block text-sm font-semibold text-main mb-1">
                Address <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.address ? 'border-error' : 'border-border'}`}
                id="center-address-input"
              />
              {fieldErrors.address && <p className="text-xs text-error mt-1">{fieldErrors.address}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-main mb-1">
                  City <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.city ? 'border-error' : 'border-border'}`}
                  id="center-city-input"
                />
                {fieldErrors.city && <p className="text-xs text-error mt-1">{fieldErrors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-main mb-1">
                  Pincode <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setField('pincode', e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.pincode ? 'border-error' : 'border-border'}`}
                  id="center-pincode-input"
                />
                {fieldErrors.pincode && <p className="text-xs text-error mt-1">{fieldErrors.pincode}</p>}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-card border border-border p-5 sm:p-6 shadow-soft space-y-4">
            <h2 className="font-heading font-extrabold text-base text-admin-accent">About Your Center</h2>
            <div>
              <label className="block text-sm font-semibold text-main mb-1">Description</label>
              <p className="text-xs text-muted mb-1.5">Tell adopters about your center's mission and the animals you care for. Max 1000 characters.</p>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Our center was founded in 2010 to help animals in need…"
                className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main resize-vertical ${fieldErrors.description ? 'border-error' : 'border-border'}`}
                id="center-description-input"
              />
              <div className="flex justify-between items-center mt-0.5">
                {fieldErrors.description
                  ? <p className="text-xs text-error">{fieldErrors.description}</p>
                  : <span />}
                <p className="text-[11px] text-muted">{form.description.length}/1000</p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              type="submit"
              disabled={saving}
              id="save-profile-btn"
              className="px-6 py-2.5 rounded-lg bg-admin-accent text-white text-sm font-semibold hover:bg-admin-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="animate-spin inline-block" aria-hidden="true">⏳</span>}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
