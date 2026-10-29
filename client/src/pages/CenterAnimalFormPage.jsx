import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';
import {
  getAnimals,
  createAnimal,
  updateAnimal,
  replaceAnimalPhoto,
} from '../api';

// ── Image picker with preview ──────────────────────────────────────────────────
function PhotoPicker({ current, onChange, required }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(current || null);
  const [error, setError] = useState(null);

  // When current changes (edit mode loaded), update preview
  useEffect(() => {
    if (current && !preview) setPreview(current);
  }, [current, preview]);

  function handleFile(file) {
    if (!file) return;
    // Client-side type check (server is the real protection)
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
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file);
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-main mb-2">
        Photo{required && <span className="text-error ml-1">*</span>}
      </label>
      {preview && (
        <div className="mb-3">
          <img
            src={preview}
            alt="Preview"
            className="w-40 h-40 object-cover rounded-xl border border-border"
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-lg border border-border bg-white text-sm font-semibold text-main hover:bg-admin-bg transition-colors"
        >
          {preview ? 'Change photo' : 'Choose photo'}
        </button>
        {preview && (
          <span className="text-xs text-muted">Photo selected</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        id="photo-file-input"
      />
      {error && <p className="text-xs text-error mt-1.5">{error}</p>}
      <p className="text-xs text-muted mt-1.5">JPG, PNG or WebP · max 5 MB</p>
    </div>
  );
}

// ── Form field helpers ─────────────────────────────────────────────────────────
function FormField({ label, required, error, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-main mb-1">
        {label}{required && <span className="text-error ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-muted mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength, error, ...rest }) {
  return (
    <div>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${
          error ? 'border-error' : 'border-border'
        }`}
        {...rest}
      />
      {maxLength && (
        <p className="text-right text-[11px] text-muted mt-0.5">{value.length}/{maxLength}</p>
      )}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, maxLength, rows = 4, error }) {
  return (
    <div>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main resize-vertical ${
          error ? 'border-error' : 'border-border'
        }`}
      />
      {maxLength && (
        <p className="text-right text-[11px] text-muted mt-0.5">{value.length}/{maxLength}</p>
      )}
    </div>
  );
}

function SelectField({ value, onChange, options, error }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main bg-white ${
        error ? 'border-error' : 'border-border'
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function CheckboxField({ label, checked, onChange, id }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-border accent-admin-accent"
      />
      <span className="text-sm text-main">{label}</span>
    </label>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-card border border-border p-5 sm:p-6 shadow-soft space-y-4">
      <h2 className="font-heading font-extrabold text-base text-admin-accent">{title}</h2>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  category: '',
  breed: '',
  ageYears: '',
  ageMonths: '',
  gender: '',
  size: '',
  good_with_kids: false,
  good_with_pets: false,
  vaccinated: false,
  neutered: false,
  description: '',
  story: '',
};

export default function CenterAnimalFormPage() {
  const { id } = useParams(); // id present → edit mode
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(isEdit); // loading existing data in edit mode
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load existing animal in edit mode
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getAnimals('all')
      .then((res) => {
        const animal = res.data.animals?.find((a) => a.id === id);
        if (!animal) {
          setServerError('Animal not found.');
          return;
        }
        const totalMonths = animal.age_months || 0;
        setForm({
          name: animal.name || '',
          category: animal.category || '',
          breed: animal.breed || '',
          ageYears: String(Math.floor(totalMonths / 12)),
          ageMonths: String(totalMonths % 12),
          gender: animal.gender || '',
          size: animal.size || '',
          good_with_kids: Boolean(animal.good_with_kids),
          good_with_pets: Boolean(animal.good_with_pets),
          vaccinated: Boolean(animal.vaccinated),
          neutered: Boolean(animal.neutered),
          description: animal.description || '',
          story: animal.story || '',
        });
        setCurrentPhotoUrl(animal.photo_url || null);
      })
      .catch(() => setServerError('Failed to load animal data.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Client-side validation
  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    else if (form.name.length > 60) errors.name = 'Name must be 60 characters or fewer.';
    if (!form.category) errors.category = 'Category is required.';
    if (!form.breed.trim()) errors.breed = 'Breed is required.';
    else if (form.breed.length > 60) errors.breed = 'Breed must be 60 characters or fewer.';
    const yrs = parseInt(form.ageYears || '0', 10);
    const mo = parseInt(form.ageMonths || '0', 10);
    if (isNaN(yrs) || isNaN(mo) || yrs < 0 || mo < 0 || mo > 11 || (yrs * 12 + mo) > 360) {
      errors.age = 'Please enter a valid age (years 0–30, months 0–11).';
    }
    if (!form.gender) errors.gender = 'Gender is required.';
    if (!form.size) errors.size = 'Size is required.';
    if (!form.description.trim()) errors.description = 'Description is required.';
    else if (form.description.length < 10) errors.description = 'Description must be at least 10 characters.';
    else if (form.description.length > 2000) errors.description = 'Description must be 2000 characters or fewer.';
    if (form.story && form.story.length > 3000) errors.story = 'Story must be 3000 characters or fewer.';
    if (!isEdit && !photoFile) errors.photo = 'A photo is required.';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstEl = document.querySelector('[data-error]');
      firstEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    const age_months = (parseInt(form.ageYears || '0', 10) * 12) + parseInt(form.ageMonths || '0', 10);

    try {
      if (isEdit) {
        // Update text fields
        await updateAnimal(id, {
          name: form.name.trim(),
          category: form.category,
          breed: form.breed.trim(),
          age_months,
          gender: form.gender,
          size: form.size,
          good_with_kids: form.good_with_kids,
          good_with_pets: form.good_with_pets,
          vaccinated: form.vaccinated,
          neutered: form.neutered,
          description: form.description.trim(),
          story: form.story.trim() || null,
        });
        // If a new photo was chosen, replace it separately
        if (photoFile) {
          const fd = new FormData();
          fd.append('photo', photoFile);
          await replaceAnimalPhoto(id, fd);
        }
      } else {
        // Create: one multipart request
        const fd = new FormData();
        fd.append('name', form.name.trim());
        fd.append('category', form.category);
        fd.append('breed', form.breed.trim());
        fd.append('age_months', String(age_months));
        fd.append('gender', form.gender);
        fd.append('size', form.size);
        fd.append('good_with_kids', String(form.good_with_kids));
        fd.append('good_with_pets', String(form.good_with_pets));
        fd.append('vaccinated', String(form.vaccinated));
        fd.append('neutered', String(form.neutered));
        fd.append('description', form.description.trim());
        if (form.story.trim()) fd.append('story', form.story.trim());
        fd.append('photo', photoFile);
        await createAnimal(fd);
      }

      setSuccess(true);
      setTimeout(() => navigate('/center/animals'), 1200);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const centerName = user?.center?.name;

  if (loading) {
    return (
      <AdminLayout centerName={centerName}>
        <div className="max-w-3xl mx-auto p-8">
          <p className="text-sm text-muted animate-pulse">Loading…</p>
        </div>
      </AdminLayout>
    );
  }

  if (success) {
    return (
      <AdminLayout centerName={centerName}>
        <div className="max-w-3xl mx-auto p-8 text-center">
          <span className="text-4xl block mb-3" aria-hidden="true">✓</span>
          <p className="font-heading font-extrabold text-lg text-success">
            {isEdit ? 'Animal updated!' : 'Animal created!'}
          </p>
          <p className="text-sm text-muted mt-1">Redirecting…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout centerName={centerName}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/center/animals')}
            className="p-2 rounded-lg hover:bg-admin-bg border border-border text-muted hover:text-main transition-colors text-sm"
            aria-label="Back to animals"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-extrabold font-heading text-main">
            {isEdit ? 'Edit Animal' : 'Add Animal'}
          </h1>
        </div>

        {serverError && (
          <div className="mb-5 p-4 rounded-xl border border-error/30 bg-error/5 text-sm text-error">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Section 1: Basics */}
          <Section title="Basics">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name" required error={fieldErrors.name}>
                <TextInput
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Buddy"
                  maxLength={60}
                  error={fieldErrors.name}
                  id="animal-name-input"
                />
              </FormField>

              <FormField label="Category" required error={fieldErrors.category}>
                <SelectField
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  error={fieldErrors.category}
                  options={[
                    { value: '', label: 'Select category', disabled: true },
                    { value: 'dog', label: 'Dog' },
                    { value: 'cat', label: 'Cat' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </FormField>

              <FormField label="Breed" required error={fieldErrors.breed}>
                <TextInput
                  value={form.breed}
                  onChange={(e) => setField('breed', e.target.value)}
                  placeholder="e.g. Labrador Retriever"
                  maxLength={60}
                  error={fieldErrors.breed}
                  id="animal-breed-input"
                />
              </FormField>

              <FormField label="Age" required error={fieldErrors.age} hint="Enter years and months">
                <div className="flex gap-2" data-error={fieldErrors.age ? true : undefined}>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={form.ageYears}
                      onChange={(e) => setField('ageYears', e.target.value)}
                      placeholder="Years"
                      className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.age ? 'border-error' : 'border-border'}`}
                      id="animal-age-years-input"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={form.ageMonths}
                      onChange={(e) => setField('ageMonths', e.target.value)}
                      placeholder="Months"
                      className={`w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 text-main ${fieldErrors.age ? 'border-error' : 'border-border'}`}
                      id="animal-age-months-input"
                    />
                  </div>
                </div>
              </FormField>

              <FormField label="Gender" required error={fieldErrors.gender}>
                <SelectField
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value)}
                  error={fieldErrors.gender}
                  options={[
                    { value: '', label: 'Select gender', disabled: true },
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                />
              </FormField>

              <FormField label="Size" required error={fieldErrors.size}>
                <SelectField
                  value={form.size}
                  onChange={(e) => setField('size', e.target.value)}
                  error={fieldErrors.size}
                  options={[
                    { value: '', label: 'Select size', disabled: true },
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                />
              </FormField>
            </div>
          </Section>

          {/* Section 2: Temperament and health */}
          <Section title="Temperament & Health">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <CheckboxField
                label="Good with kids"
                checked={form.good_with_kids}
                onChange={(e) => setField('good_with_kids', e.target.checked)}
                id="good-with-kids-cb"
              />
              <CheckboxField
                label="Good with pets"
                checked={form.good_with_pets}
                onChange={(e) => setField('good_with_pets', e.target.checked)}
                id="good-with-pets-cb"
              />
              <CheckboxField
                label="Vaccinated"
                checked={form.vaccinated}
                onChange={(e) => setField('vaccinated', e.target.checked)}
                id="vaccinated-cb"
              />
              <CheckboxField
                label="Neutered"
                checked={form.neutered}
                onChange={(e) => setField('neutered', e.target.checked)}
                id="neutered-cb"
              />
            </div>
          </Section>

          {/* Section 3: About */}
          <Section title="About">
            <FormField label="Description" required error={fieldErrors.description} hint="Tell adopters about this animal's personality, needs and background. Minimum 10 characters.">
              <TextArea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Describe the animal's personality, health, and what kind of home they need…"
                maxLength={2000}
                rows={5}
                error={fieldErrors.description}
              />
            </FormField>

            <FormField label="Story" error={fieldErrors.story} hint="Optional — a short story about how this animal came to the center. Max 3000 characters.">
              <TextArea
                value={form.story}
                onChange={(e) => setField('story', e.target.value)}
                placeholder="e.g. Buddy was found wandering near the highway…"
                maxLength={3000}
                rows={4}
                error={fieldErrors.story}
              />
            </FormField>
          </Section>

          {/* Section 4: Photo */}
          <Section title="Photo">
            {fieldErrors.photo && (
              <p className="text-xs text-error">{fieldErrors.photo}</p>
            )}
            <PhotoPicker
              current={currentPhotoUrl}
              onChange={(file) => {
                setPhotoFile(file);
                setFieldErrors((prev) => ({ ...prev, photo: undefined }));
              }}
              required={!isEdit}
            />
          </Section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/center/animals')}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold text-main hover:bg-admin-bg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="submit-animal-btn"
              className="px-6 py-2.5 rounded-lg bg-admin-accent text-white text-sm font-semibold hover:bg-admin-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <span className="animate-spin inline-block" aria-hidden="true">⏳</span>}
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add animal'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
