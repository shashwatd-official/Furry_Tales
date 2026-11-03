import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBrowseAnimal, submitApplication } from '../api';
import AdopterLayout from '../components/AdopterLayout';

// ---------------------------------------------------------------------------
// Step names
// ---------------------------------------------------------------------------
const STEPS = [
  'Applicant Details',
  'Home & Lifestyle',
  'Household',
  'Animal Experience',
  'Motivation & Care',
  'Consent',
];

// ---------------------------------------------------------------------------
// Initial form state — field names match the server's form_data schema exactly.
// ---------------------------------------------------------------------------
const INITIAL_FORM = {
  full_name:           '',
  phone:               '',
  // email is read-only from auth context; stored as _email (prefixed so it is
  // never sent to the server as part of form state accidentally)
  _email:              '',
  address:             '',
  is_adult:            false,

  home_type:           '',
  ownership:           '',
  // null = owned (must be omitted/null when ownership is 'owned')
  // true/false = landlord permission when ownership is 'rented'
  landlord_permission: null,
  outdoor_space:       null,   // boolean true/false

  adults_count:        '',
  children:            '',
  other_pets:          '',

  had_pets_before:     null,   // boolean
  pet_details:         '',
  hours_alone:         '',

  reason:              '',
  caregiver:           '',
  vet_commitment:      false,

  consent_visit:       false,
  consent_policy:      false,
};

// ---------------------------------------------------------------------------
// Per-step validation — must mirror server rules exactly.
// Returns { fieldId, message } or null when step is valid.
// ---------------------------------------------------------------------------
function validateStep(step, form) {
  switch (step) {
    case 0: {
      if (!form.full_name.trim() || form.full_name.trim().length < 2)
        return { fieldId: 'full_name', message: 'Full name must be at least 2 characters.' };
      if (form.full_name.trim().length > 100)
        return { fieldId: 'full_name', message: 'Full name must be at most 100 characters.' };
      if (!form.phone.trim() || form.phone.trim().length < 7)
        return { fieldId: 'phone', message: 'Please enter a valid phone number (at least 7 characters).' };
      if (!form.address.trim() || form.address.trim().length < 5)
        return { fieldId: 'address', message: 'Address must be at least 5 characters.' };
      if (form.address.trim().length > 300)
        return { fieldId: 'address', message: 'Address must be at most 300 characters.' };
      if (!form.is_adult)
        return { fieldId: 'is_adult', message: 'You must confirm you are 18 or older.' };
      return null;
    }
    case 1: {
      if (!form.home_type)
        return { fieldId: 'home_type', message: 'Please select your type of home.' };
      if (!form.ownership)
        return { fieldId: 'ownership', message: 'Please select whether you own or rent your home.' };
      if (form.ownership === 'rented' && typeof form.landlord_permission !== 'boolean')
        return { fieldId: 'landlord_permission', message: 'Please indicate whether your landlord permits pets.' };
      if (form.outdoor_space === null)
        return { fieldId: 'outdoor_space', message: 'Please indicate whether you have an outdoor space.' };
      return null;
    }
    case 2: {
      const ac = Number(form.adults_count);
      if (!form.adults_count || isNaN(ac) || !Number.isInteger(ac) || ac < 1)
        return { fieldId: 'adults_count', message: 'Number of adults must be a whole number of at least 1.' };
      if (ac > 20)
        return { fieldId: 'adults_count', message: 'Number of adults cannot exceed 20.' };
      if (!form.children.trim() || form.children.trim().length < 1)
        return { fieldId: 'children', message: 'Please describe children in the household, or enter "none".' };
      if (form.children.trim().length > 100)
        return { fieldId: 'children', message: 'Children field must be at most 100 characters.' };
      if (!form.other_pets.trim() || form.other_pets.trim().length < 1)
        return { fieldId: 'other_pets', message: 'Please describe other pets at home, or enter "none".' };
      if (form.other_pets.trim().length > 300)
        return { fieldId: 'other_pets', message: 'Other pets field must be at most 300 characters.' };
      return null;
    }
    case 3: {
      if (form.had_pets_before === null)
        return { fieldId: 'had_pets_before_yes', message: 'Please indicate whether you have had pets before.' };
      if (form.had_pets_before === true && !form.pet_details.trim())
        return { fieldId: 'pet_details', message: 'Please describe the pets you have had before.' };
      if (form.had_pets_before === true && form.pet_details.trim().length > 300)
        return { fieldId: 'pet_details', message: 'Pet details must be at most 300 characters.' };
      const ha = Number(form.hours_alone);
      if (form.hours_alone === '' || isNaN(ha) || !Number.isInteger(ha))
        return { fieldId: 'hours_alone', message: 'Hours alone must be a whole number.' };
      if (ha < 0 || ha > 24)
        return { fieldId: 'hours_alone', message: 'Hours alone must be between 0 and 24.' };
      return null;
    }
    case 4: {
      if (!form.reason.trim() || form.reason.trim().length < 20)
        return { fieldId: 'reason', message: 'Please tell us why you want to adopt (at least 20 characters).' };
      if (form.reason.trim().length > 1000)
        return { fieldId: 'reason', message: 'Reason must be at most 1000 characters.' };
      if (!form.caregiver.trim() || form.caregiver.trim().length < 5)
        return { fieldId: 'caregiver', message: 'Please tell us who will primarily care for the pet (at least 5 characters).' };
      if (form.caregiver.trim().length > 300)
        return { fieldId: 'caregiver', message: 'Caregiver must be at most 300 characters.' };
      if (!form.vet_commitment)
        return { fieldId: 'vet_commitment', message: 'You must commit to providing regular vet care.' };
      return null;
    }
    case 5: {
      if (!form.consent_visit)
        return { fieldId: 'consent_visit', message: 'You must agree to allow a home or center visit.' };
      if (!form.consent_policy)
        return { fieldId: 'consent_policy', message: "You must agree to the center's adoption policy." };
      return null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Small reusable components
// ---------------------------------------------------------------------------
function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-main mb-1">
      {children}
      {required && <span className="text-error ml-0.5" aria-label="required">*</span>}
    </label>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-error font-semibold mt-1.5">
      {message}
    </p>
  );
}

function Input({ id, type = 'text', value, onChange, placeholder, ariaDescribedby, ariaInvalid, className = '', ...rest }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid || undefined}
      className={`w-full border rounded-xl px-4 py-2.5 text-sm text-main bg-white focus:outline-none focus:ring-2 transition-colors placeholder:text-muted/60 ${ariaInvalid ? 'border-error focus:ring-error/30' : 'border-border focus:ring-primary/40 focus:border-primary'} ${className}`}
      {...rest}
    />
  );
}

function Textarea({ id, value, onChange, placeholder, ariaDescribedby, ariaInvalid, rows = 3 }) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid || undefined}
      className={`w-full border rounded-xl px-4 py-2.5 text-sm text-main bg-white focus:outline-none focus:ring-2 transition-colors placeholder:text-muted/60 resize-y ${ariaInvalid ? 'border-error focus:ring-error/30' : 'border-border focus:ring-primary/40 focus:border-primary'}`}
    />
  );
}

function RadioGroup({ legend, name, value, onChange, options, required, errorId, invalid }) {
  return (
    <fieldset aria-describedby={errorId} aria-invalid={invalid || undefined}>
      <legend className="block text-sm font-semibold text-main mb-2">
        {legend}{required && <span className="text-error ml-0.5" aria-label="required">*</span>}
      </legend>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
              value === opt.value
                ? 'border-primary bg-accent-blush/40 text-primary'
                : 'border-border bg-white text-muted hover:border-primary/50 hover:text-main'
            }`}
          >
            <input
              id={name + '_' + opt.value}
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Step components — each receives (form, setField, fieldErrors)
// ---------------------------------------------------------------------------
function StepApplicantDetails({ form, setField, fieldErrors }) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="full_name" required>Full name</Label>
        <Input id="full_name" value={form.full_name} onChange={(e) => setField('full_name', e.target.value)}
          placeholder="Your full name" ariaDescribedby={fieldErrors.full_name ? 'err-full_name' : undefined}
          ariaInvalid={!!fieldErrors.full_name} />
        <FieldError id="err-full_name" message={fieldErrors.full_name} />
      </div>
      <div>
        <Label htmlFor="phone" required>Phone number</Label>
        <Input id="phone" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)}
          placeholder="e.g. +91 98765 43210" ariaDescribedby={fieldErrors.phone ? 'err-phone' : undefined}
          ariaInvalid={!!fieldErrors.phone} />
        <FieldError id="err-phone" message={fieldErrors.phone} />
      </div>
      <div>
        <Label htmlFor="email_display" required>Email</Label>
        <Input id="email_display" type="email" value={form._email} readOnly
          className="bg-background cursor-not-allowed opacity-70" ariaDescribedby="email-note" />
        <p id="email-note" className="text-xs text-muted mt-1">
          This is your account email and cannot be changed here.
        </p>
      </div>
      <div>
        <Label htmlFor="address" required>Home address</Label>
        <Textarea id="address" value={form.address} onChange={(e) => setField('address', e.target.value)}
          placeholder="Your current home address" rows={2}
          ariaDescribedby={fieldErrors.address ? 'err-address' : undefined} ariaInvalid={!!fieldErrors.address} />
        <FieldError id="err-address" message={fieldErrors.address} />
      </div>
      <div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input id="is_adult" type="checkbox" checked={form.is_adult}
            onChange={(e) => setField('is_adult', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary rounded flex-shrink-0"
            aria-describedby={fieldErrors.is_adult ? 'err-is_adult' : undefined}
            aria-invalid={!!fieldErrors.is_adult || undefined} />
          <span className="text-sm text-main group-hover:text-primary transition-colors">
            <span className="font-semibold">I confirm I am 18 years or older.</span>
            <span className="text-error ml-0.5">*</span>
          </span>
        </label>
        <FieldError id="err-is_adult" message={fieldErrors.is_adult} />
      </div>
    </div>
  );
}

function StepHomeLifestyle({ form, setField, fieldErrors }) {
  const showLandlord = form.ownership === 'rented';
  return (
    <div className="space-y-6">
      <div>
        <RadioGroup legend="Type of home" name="home_type" value={form.home_type}
          onChange={(v) => setField('home_type', v)} required
          options={[{ value: 'house', label: '🏠 House' }, { value: 'apartment', label: '🏢 Apartment' }]}
          errorId={fieldErrors.home_type ? 'err-home_type' : undefined} invalid={!!fieldErrors.home_type} />
        <FieldError id="err-home_type" message={fieldErrors.home_type} />
      </div>
      <div>
        <RadioGroup legend="Do you own or rent your home?" name="ownership" value={form.ownership}
          onChange={(v) => { setField('ownership', v); if (v === 'owned') setField('landlord_permission', null); }} required
          options={[{ value: 'owned', label: '🔑 Own' }, { value: 'rented', label: '📄 Rent' }]}
          errorId={fieldErrors.ownership ? 'err-ownership' : undefined} invalid={!!fieldErrors.ownership} />
        <FieldError id="err-ownership" message={fieldErrors.ownership} />
      </div>
      {showLandlord && (
        <div>
          <RadioGroup legend="Does your landlord permit pets?" name="landlord_permission"
            value={form.landlord_permission === null ? '' : String(form.landlord_permission)}
            onChange={(v) => setField('landlord_permission', v === 'true')} required
            options={[{ value: 'true', label: '✅ Yes' }, { value: 'false', label: '❌ No' }]}
            errorId={fieldErrors.landlord_permission ? 'err-landlord_permission' : undefined}
            invalid={!!fieldErrors.landlord_permission} />
          <FieldError id="err-landlord_permission" message={fieldErrors.landlord_permission} />
        </div>
      )}
      <div>
        <RadioGroup legend="Do you have an outdoor space (garden, yard, balcony)?" name="outdoor_space"
          value={form.outdoor_space === null ? '' : String(form.outdoor_space)}
          onChange={(v) => setField('outdoor_space', v === 'true')} required
          options={[{ value: 'true', label: '🌿 Yes' }, { value: 'false', label: '🚫 No' }]}
          errorId={fieldErrors.outdoor_space ? 'err-outdoor_space' : undefined} invalid={!!fieldErrors.outdoor_space} />
        <FieldError id="err-outdoor_space" message={fieldErrors.outdoor_space} />
      </div>
    </div>
  );
}

function StepHousehold({ form, setField, fieldErrors }) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="adults_count" required>Number of adults in household</Label>
        <Input id="adults_count" type="number" min={1} max={20} value={form.adults_count}
          onChange={(e) => setField('adults_count', e.target.value)} placeholder="e.g. 2"
          ariaDescribedby={fieldErrors.adults_count ? 'err-adults_count' : undefined}
          ariaInvalid={!!fieldErrors.adults_count} />
        <FieldError id="err-adults_count" message={fieldErrors.adults_count} />
      </div>
      <div>
        <Label htmlFor="children" required>Children in household (ages, or "none")</Label>
        <Input id="children" value={form.children} onChange={(e) => setField('children', e.target.value)}
          placeholder='e.g. "5, 8" or "none"'
          ariaDescribedby={`children-hint${fieldErrors.children ? ' err-children' : ''}`}
          ariaInvalid={!!fieldErrors.children} />
        <p id="children-hint" className="text-xs text-muted mt-1">
          List ages separated by commas, or type "none" if there are no children. Max 100 characters.
        </p>
        <FieldError id="err-children" message={fieldErrors.children} />
      </div>
      <div>
        <Label htmlFor="other_pets" required>Other pets currently at home (or "none")</Label>
        <Input id="other_pets" value={form.other_pets} onChange={(e) => setField('other_pets', e.target.value)}
          placeholder='e.g. "1 dog, 2 cats" or "none"'
          ariaDescribedby={`other-pets-hint${fieldErrors.other_pets ? ' err-other_pets' : ''}`}
          ariaInvalid={!!fieldErrors.other_pets} />
        <p id="other-pets-hint" className="text-xs text-muted mt-1">
          Describe all pets, or type "none". Max 300 characters.
        </p>
        <FieldError id="err-other_pets" message={fieldErrors.other_pets} />
      </div>
    </div>
  );
}

function StepExperience({ form, setField, fieldErrors }) {
  return (
    <div className="space-y-6">
      <div>
        <fieldset aria-describedby={fieldErrors.had_pets_before ? 'err-had_pets_before' : undefined}>
          <legend className="block text-sm font-semibold text-main mb-2">
            Have you owned pets before? <span className="text-error ml-0.5">*</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {[{ id: 'had_pets_before_yes', val: true, label: '✅ Yes' },
              { id: 'had_pets_before_no', val: false, label: '🚫 No' }].map(({ id, val, label }) => (
              <label key={id} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                form.had_pets_before === val ? 'border-primary bg-accent-blush/40 text-primary' : 'border-border bg-white text-muted hover:border-primary/50 hover:text-main'
              }`}>
                <input id={id} type="radio" name="had_pets_before" value={String(val)}
                  checked={form.had_pets_before === val}
                  onChange={() => { setField('had_pets_before', val); if (!val) setField('pet_details', ''); }}
                  className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <FieldError id="err-had_pets_before" message={fieldErrors.had_pets_before} />
      </div>
      {form.had_pets_before === true && (
        <div>
          <Label htmlFor="pet_details" required>Describe the pets you have had before</Label>
          <Textarea id="pet_details" value={form.pet_details} onChange={(e) => setField('pet_details', e.target.value)}
            placeholder='e.g. "1 Labrador for 7 years, 2 cats"'
            ariaDescribedby={`pet-details-hint${fieldErrors.pet_details ? ' err-pet_details' : ''}`}
            ariaInvalid={!!fieldErrors.pet_details} />
          <p id="pet-details-hint" className="text-xs text-muted mt-1">Max 300 characters.</p>
          <FieldError id="err-pet_details" message={fieldErrors.pet_details} />
        </div>
      )}
      <div>
        <Label htmlFor="hours_alone" required>Hours per day the pet would be left alone</Label>
        <Input id="hours_alone" type="number" min={0} max={24} step={1} value={form.hours_alone}
          onChange={(e) => setField('hours_alone', e.target.value)} placeholder="e.g. 4"
          ariaDescribedby={`hours-hint${fieldErrors.hours_alone ? ' err-hours_alone' : ''}`}
          ariaInvalid={!!fieldErrors.hours_alone} />
        <p id="hours-hint" className="text-xs text-muted mt-1">Enter a whole number from 0 to 24.</p>
        <FieldError id="err-hours_alone" message={fieldErrors.hours_alone} />
      </div>
    </div>
  );
}

function StepMotivation({ form, setField, fieldErrors }) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="reason" required>Why do you want to adopt this animal?</Label>
        <Textarea id="reason" value={form.reason} onChange={(e) => setField('reason', e.target.value)}
          placeholder="Share your reasons (at least 20 characters)..." rows={4}
          ariaDescribedby={`reason-hint${fieldErrors.reason ? ' err-reason' : ''}`}
          ariaInvalid={!!fieldErrors.reason} />
        <p id="reason-hint" className="text-xs text-muted mt-1">20 to 1000 characters.</p>
        <FieldError id="err-reason" message={fieldErrors.reason} />
      </div>
      <div>
        <Label htmlFor="caregiver" required>Who will primarily care for the pet?</Label>
        <Input id="caregiver" value={form.caregiver} onChange={(e) => setField('caregiver', e.target.value)}
          placeholder="e.g. Myself, partner helps on weekends"
          ariaDescribedby={fieldErrors.caregiver ? 'err-caregiver' : undefined}
          ariaInvalid={!!fieldErrors.caregiver} />
        <FieldError id="err-caregiver" message={fieldErrors.caregiver} />
      </div>
      <div className="p-4 rounded-xl border bg-white hover:border-primary/40 transition-colors"
        style={{ borderColor: fieldErrors.vet_commitment ? 'rgb(180 35 50 / 0.5)' : undefined }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input id="vet_commitment" type="checkbox" checked={form.vet_commitment}
            onChange={(e) => setField('vet_commitment', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary rounded flex-shrink-0"
            aria-describedby={fieldErrors.vet_commitment ? 'err-vet_commitment' : undefined}
            aria-invalid={!!fieldErrors.vet_commitment || undefined} />
          <span className="text-sm text-main">
            <span className="font-semibold">I commit to providing regular vet care for this animal</span>
            <span className="text-error ml-0.5">*</span>
            <br />
            <span className="text-muted text-xs">
              I understand that responsible pet ownership includes regular check-ups, vaccinations, and necessary treatments.
            </span>
          </span>
        </label>
        <FieldError id="err-vet_commitment" message={fieldErrors.vet_commitment} />
      </div>
    </div>
  );
}

function StepConsent({ form, setField, fieldErrors, animalName, centerName }) {
  return (
    <div className="space-y-6">
      <div className="p-5 bg-accent-blush/20 border border-accent-blush/40 rounded-xl text-sm text-main leading-relaxed">
        <p className="font-semibold mb-2">Almost there! 🐾</p>
        <p>
          By submitting this application for <strong>{animalName}</strong> at{' '}
          <strong>{centerName}</strong>, you agree to the following:
        </p>
      </div>
      <div className={`p-4 rounded-xl border bg-white hover:border-primary/40 transition-colors ${fieldErrors.consent_visit ? 'border-error/50' : 'border-border'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input id="consent_visit" type="checkbox" checked={form.consent_visit}
            onChange={(e) => setField('consent_visit', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary rounded flex-shrink-0"
            aria-describedby={fieldErrors.consent_visit ? 'err-consent_visit' : undefined}
            aria-invalid={!!fieldErrors.consent_visit || undefined} />
          <span className="text-sm text-main">
            <span className="font-semibold">I agree to a home or center visit</span>
            <span className="text-error ml-0.5">*</span>
            <br />
            <span className="text-muted text-xs">
              I understand that the center may request to visit my home or invite me for a visit before finalising the adoption.
            </span>
          </span>
        </label>
        <FieldError id="err-consent_visit" message={fieldErrors.consent_visit} />
      </div>
      <div className={`p-4 rounded-xl border bg-white hover:border-primary/40 transition-colors ${fieldErrors.consent_policy ? 'border-error/50' : 'border-border'}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input id="consent_policy" type="checkbox" checked={form.consent_policy}
            onChange={(e) => setField('consent_policy', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary rounded flex-shrink-0"
            aria-describedby={fieldErrors.consent_policy ? 'err-consent_policy' : undefined}
            aria-invalid={!!fieldErrors.consent_policy || undefined} />
          <span className="text-sm text-main">
            <span className="font-semibold">I agree to the center's adoption policy</span>
            <span className="text-error ml-0.5">*</span>
            <br />
            <span className="text-muted text-xs">
              I confirm that the information in this application is accurate and that I will comply with the center's adoption terms and conditions.
            </span>
          </span>
        </label>
        <FieldError id="err-consent_policy" message={fieldErrors.consent_policy} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AdopterApplicationFormPage() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [animal, setAnimal] = useState(null);
  const [animalLoading, setAnimalLoading] = useState(true);
  const [animalError, setAnimalError] = useState(null);

  const [step, setStep] = useState(0);
  const [form, setFormState] = useState(INITIAL_FORM);
  // fieldErrors: { [fieldId]: errorMessage }
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill name and email from logged-in user
  useEffect(() => {
    if (user) {
      setFormState((prev) => ({
        ...prev,
        full_name: prev.full_name || user.name || '',
        _email: user.email || '',
      }));
    }
  }, [user]);

  // Fetch animal detail
  useEffect(() => {
    if (!animalId) return;
    setAnimalLoading(true);
    setAnimalError(null);
    getBrowseAnimal(animalId)
      .then((res) => { setAnimal(res.data); setAnimalLoading(false); })
      .catch((err) => {
        setAnimalError(err.response?.status === 404
          ? 'This animal is no longer available for adoption.'
          : 'Could not load animal details. Please try again.');
        setAnimalLoading(false);
      });
  }, [animalId]);

  function setField(key, value) {
    setFormState((prev) => ({ ...prev, [key]: value }));
    // Clear the error for this field as the user edits it
    if (fieldErrors[key]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }
  }

  /**
   * Run step validation.
   * If invalid: store the per-field error, move focus to the first invalid field, return false.
   * If valid: clear errors, return true.
   */
  function runValidation() {
    const err = validateStep(step, form);
    if (!err) {
      setFieldErrors({});
      return true;
    }
    setFieldErrors({ [err.fieldId]: err.message });
    // Move focus to the first invalid field
    requestAnimationFrame(() => {
      const el = document.getElementById(err.fieldId);
      if (el) el.focus();
    });
    return false;
  }

  function handleNext() {
    if (!runValidation()) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function handleBack() {
    setFieldErrors({});
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!runValidation()) return;

    setSubmitting(true);
    setSubmitError(null);

    // Build the nested payload the server expects:
    // { animal_id, form_data: { all fields } }
    const ha = Number(form.hours_alone);
    const ac = Number(form.adults_count);
    const payload = {
      animal_id: animalId,
      form_data: {
        full_name:           form.full_name.trim(),
        phone:               form.phone.trim(),
        email:               form._email.trim(),
        address:             form.address.trim(),
        is_adult:            form.is_adult,
        home_type:           form.home_type,
        ownership:           form.ownership,
        landlord_permission: form.ownership === 'owned' ? null : form.landlord_permission,
        outdoor_space:       form.outdoor_space,
        adults_count:        ac,
        children:            form.children.trim(),
        other_pets:          form.other_pets.trim(),
        had_pets_before:     form.had_pets_before,
        pet_details:         form.had_pets_before ? form.pet_details.trim() : null,
        hours_alone:         ha,
        reason:              form.reason.trim(),
        caregiver:           form.caregiver.trim(),
        vet_commitment:      form.vet_commitment,
        consent_visit:       form.consent_visit,
        consent_policy:      form.consent_policy,
      },
    };

    try {
      await submitApplication(payload);
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <AdopterLayout>
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="text-6xl" aria-hidden="true">🐾</div>
          <h1 className="font-heading text-3xl font-extrabold text-main">Application Submitted!</h1>
          <p className="text-muted text-base leading-relaxed">
            Thank you for applying to adopt{' '}
            <strong className="text-main">{animal?.name}</strong>. A confirmation
            email has been sent to you. You will be emailed again when the center decides.
            Track your application under <strong>My Applications</strong>.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/my-applications"
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors">
              View My Applications
            </Link>
            <Link to="/animals"
              className="px-6 py-3 rounded-xl bg-card border border-border text-main font-bold text-sm hover:bg-background transition-colors">
              Find Another Friend
            </Link>
          </div>
        </div>
      </AdopterLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------
  return (
    <AdopterLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <button type="button" onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors mb-6">
          <span aria-hidden="true">←</span> Back
        </button>

        {/* Animal header */}
        {animalLoading && <div className="h-20 bg-card animate-pulse rounded-xl mb-8" />}
        {animalError && (
          <div className="p-5 bg-error/10 border border-error/30 rounded-xl text-sm text-error font-semibold mb-8">
            {animalError}
            <Link to="/animals" className="block mt-2 underline text-primary font-bold">Browse animals</Link>
          </div>
        )}
        {animal && !animalError && (
          <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-xl border border-border shadow-soft">
            {animal.photo_url && (
              <img src={animal.photo_url} alt={animal.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
            )}
            <div>
              <h1 className="font-heading text-xl font-extrabold text-main">Adoption Application</h1>
              <p className="text-sm text-muted">
                For <strong className="text-primary">{animal.name}</strong> at {animal.center_name}
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8" aria-label="Application progress">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-xs font-semibold text-primary">{STEPS[step]}</p>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}
              aria-label={`Step ${step + 1} of ${STEPS.length}`} />
          </div>
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                i < step ? 'bg-success/15 text-success border border-success/30'
                  : i === step ? 'bg-primary text-white'
                  : 'bg-background text-muted border border-border'
              }`}>
                {i < step ? '✓ ' : ''}{s}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={step < STEPS.length - 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit}
          noValidate id="application-form">
          <div className="bg-white border border-border rounded-2xl shadow-soft p-6 sm:p-8 space-y-6">
            <h2 className="font-heading text-lg font-extrabold text-main border-b border-border pb-4">
              {STEPS[step]}
            </h2>

            {step === 0 && <StepApplicantDetails form={form} setField={setField} fieldErrors={fieldErrors} />}
            {step === 1 && <StepHomeLifestyle form={form} setField={setField} fieldErrors={fieldErrors} />}
            {step === 2 && <StepHousehold form={form} setField={setField} fieldErrors={fieldErrors} />}
            {step === 3 && <StepExperience form={form} setField={setField} fieldErrors={fieldErrors} />}
            {step === 4 && <StepMotivation form={form} setField={setField} fieldErrors={fieldErrors} />}
            {step === 5 && (
              <StepConsent form={form} setField={setField} fieldErrors={fieldErrors}
                animalName={animal?.name || 'this animal'}
                centerName={animal?.center_name || 'the center'} />
            )}

            {/* Server-level submit error (shown on last step) */}
            {submitError && step === STEPS.length - 1 && (
              <div role="alert" className="text-sm text-error font-semibold bg-error/10 border border-error/30 rounded-xl px-4 py-3">
                {submitError}
                {submitError.includes('pending application') && (
                  <Link to="/my-applications" className="block mt-1 underline font-bold text-primary">
                    View My Applications →
                  </Link>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
              {step > 0 ? (
                <button type="button" onClick={handleBack}
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-main text-sm font-bold hover:bg-background transition-colors min-h-[44px]">
                  ← Back
                </button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <button type="submit"
                  className="px-7 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors min-h-[44px]">
                  Next →
                </button>
              ) : (
                <button type="submit" id="submit-application-btn" disabled={submitting}
                  className="px-7 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                  {submitting ? (
                    <><span className="animate-spin text-base" aria-hidden="true">⏳</span>Submitting…</>
                  ) : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </AdopterLayout>
  );
}
