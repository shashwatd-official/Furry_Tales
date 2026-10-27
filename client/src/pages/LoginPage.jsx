import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signupAdopter, signupCenter, login as apiLogin } from '../api';

/* ── Tiny shared components ─────────────────────────────────────── */

function InputField({ id, label, type = 'text', required, value, onChange, error, placeholder, accept }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-main">
        {label}
        {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        accept={accept}
        className={`
          w-full px-3.5 py-2.5 rounded-lg border text-sm text-main placeholder-muted
          bg-white focus:outline-none focus:ring-2 transition-colors
          ${error
            ? 'border-error focus:ring-error/20'
            : 'border-border focus:border-primary focus:ring-primary/20'
          }
        `}
      />
      {error && (
        <p className="text-xs text-error mt-0.5">{error}</p>
      )}
    </div>
  );
}

function FileField({ id, label, required, onChange, error, fileName }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-main">
        {label}
        {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
      </label>
      <label
        htmlFor={id}
        className={`
          flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer
          bg-white text-sm transition-colors
          ${error
            ? 'border-error'
            : 'border-border hover:border-primary'
          }
        `}
      >
        <span className="text-primary font-medium">Choose file</span>
        <span className="text-muted truncate">{fileName || 'No file chosen'}</span>
        <input
          id={id}
          type="file"
          className="sr-only"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onChange}
        />
      </label>
      {error && <p className="text-xs text-error mt-0.5">{error}</p>}
      <p className="text-xs text-muted">PDF, JPG, or PNG · max 5 MB</p>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
    >
      {message}
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold text-sm
        hover:bg-primary-hover active:scale-[0.99] transition-all duration-150
        disabled:opacity-60 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary/40
      "
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

/* ── Static placeholder illustration ────────────────────────────── */
function PlaceholderIllustration({ variant }) {
  // Phase 8 will replace this with the animated dog/cat scene
  if (variant === 'adopt') {
    return (
      <div className="flex flex-col items-center gap-3 select-none pointer-events-none" aria-hidden="true">
        <div className="text-6xl">🐾</div>
        <div className="flex gap-2 text-4xl">
          <span>🐶</span>
          <span>🐱</span>
        </div>
        <p className="text-sm text-white/80 font-medium mt-1">Find your new companion</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 select-none pointer-events-none" aria-hidden="true">
      <div className="text-6xl">🏠</div>
      <div className="text-4xl">📋</div>
      <p className="text-sm text-white/80 font-medium mt-1">Manage your center</p>
    </div>
  );
}

/* ── Adopter sign-up form ───────────────────────────────────────── */
function AdopterSignupForm({ onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', city: '', pincode: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await signupAdopter(form);
      onSuccess(res.data.user);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <ErrorBanner message={apiError} />
      <InputField id="a-name" label="Full name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="Your name" />
      <InputField id="a-email" label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
      <InputField id="a-password" label="Password" type="password" required value={form.password} onChange={set('password')} error={errors.password} placeholder="At least 8 characters" />
      <InputField id="a-phone" label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+91 98765 43210" />
      <div className="grid grid-cols-2 gap-3">
        <InputField id="a-city" label="City" value={form.city} onChange={set('city')} placeholder="Mumbai" />
        <InputField id="a-pincode" label="Pincode" value={form.pincode} onChange={set('pincode')} placeholder="400001" />
      </div>
      <SubmitButton loading={loading}>Create account</SubmitButton>
    </form>
  );
}

/* ── Adopter sign-in form ───────────────────────────────────────── */
function AdopterSigninForm({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    try {
      const res = await apiLogin(form);
      onSuccess(res.data.user);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <ErrorBanner message={apiError} />
      <InputField id="al-email" label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
      <InputField id="al-password" label="Password" type="password" required value={form.password} onChange={set('password')} placeholder="Your password" />
      <SubmitButton loading={loading}>Sign in</SubmitButton>
    </form>
  );
}

/* ── Center sign-up form ────────────────────────────────────────── */
function CenterSignupForm({ onSuccess }) {
  const [form, setForm] = useState({
    adminName: '', email: '', password: '', adminPhone: '',
    centerName: '', address: '', city: '', pincode: '',
    contactEmail: '', centerPhone: '', description: '',
  });
  const [docFile, setDocFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.adminName.trim()) e.adminName = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!form.centerName.trim()) e.centerName = 'Center name is required.';
    if (!form.address.trim()) e.address = 'Address is required.';
    if (!form.city.trim()) e.city = 'City is required.';
    if (!form.pincode.trim()) e.pincode = 'Pincode is required.';
    if (!form.contactEmail.trim()) e.contactEmail = 'Contact email is required.';
    if (!form.centerPhone.trim()) e.centerPhone = 'Center phone is required.';
    if (!docFile) e.verificationDoc = 'Verification document is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    setApiError('');

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('verificationDoc', docFile);

      const res = await signupCenter(fd);
      onSuccess(res.data.user);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <ErrorBanner message={apiError} />

      {/* Admin account section */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Your account</p>
        <div className="flex flex-col gap-3">
          <InputField id="c-adminName" label="Your name" required value={form.adminName} onChange={set('adminName')} error={errors.adminName} placeholder="Admin name" />
          <InputField id="c-email" label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} placeholder="admin@example.com" />
          <InputField id="c-password" label="Password" type="password" required value={form.password} onChange={set('password')} error={errors.password} placeholder="At least 8 characters" />
          <InputField id="c-adminPhone" label="Phone" type="tel" value={form.adminPhone} onChange={set('adminPhone')} placeholder="+91 98765 43210" />
        </div>
      </div>

      {/* Center profile section */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Center profile</p>
        <div className="flex flex-col gap-3">
          <InputField id="c-centerName" label="Center name" required value={form.centerName} onChange={set('centerName')} error={errors.centerName} placeholder="Happy Paws Rescue" />
          <InputField id="c-address" label="Address" required value={form.address} onChange={set('address')} error={errors.address} placeholder="123 Park Street" />
          <div className="grid grid-cols-2 gap-3">
            <InputField id="c-city" label="City" required value={form.city} onChange={set('city')} error={errors.city} placeholder="Mumbai" />
            <InputField id="c-pincode" label="Pincode" required value={form.pincode} onChange={set('pincode')} error={errors.pincode} placeholder="400001" />
          </div>
          <InputField id="c-contactEmail" label="Center contact email" type="email" required value={form.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} placeholder="contact@happypaws.org" />
          <InputField id="c-centerPhone" label="Center phone" type="tel" required value={form.centerPhone} onChange={set('centerPhone')} error={errors.centerPhone} placeholder="+91 22 1234 5678" />
          <div>
            <label htmlFor="c-description" className="text-sm font-medium text-main">Description</label>
            <textarea
              id="c-description"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Tell adopters about your center…"
              className="mt-1 w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-main placeholder-muted bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
            />
          </div>
          <FileField
            id="c-verificationDoc"
            label="Verification document"
            required
            fileName={docFile?.name}
            onChange={(e) => setDocFile(e.target.files[0] || null)}
            error={errors.verificationDoc}
          />
        </div>
      </div>

      <SubmitButton loading={loading}>Submit registration</SubmitButton>
    </form>
  );
}

/* ── Center sign-in form ─────────────────────────────────────────── */
function CenterSigninForm({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    try {
      const res = await apiLogin(form);
      onSuccess(res.data.user);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <ErrorBanner message={apiError} />
      <InputField id="cl-email" label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="admin@example.com" />
      <InputField id="cl-password" label="Password" type="password" required value={form.password} onChange={set('password')} placeholder="Your password" />
      <p className="text-xs text-muted text-center">
        Platform owners also sign in here.
      </p>
      <SubmitButton loading={loading}>Sign in</SubmitButton>
    </form>
  );
}

/* ── Role panel card ─────────────────────────────────────────────── */
function RolePanel({ role, onClick }) {
  const isAdopt = role === 'adopt';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center gap-5
        rounded-2xl p-8 cursor-pointer border-0
        transition-transform duration-200 ease-out focus:outline-none
        focus-visible:ring-4 focus-visible:ring-white/50
        hover:scale-[1.03] active:scale-[0.99]
        motion-reduce:transition-none motion-reduce:hover:scale-100
        ${isAdopt
          ? 'bg-gradient-to-br from-primary to-[#8F4228]'
          : 'bg-gradient-to-br from-admin-accent to-[#2A4A39]'
        }
      `}
      aria-label={isAdopt ? "I'm looking to adopt" : 'I manage a center'}
    >
      <PlaceholderIllustration variant={role} />
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-white font-heading leading-tight">
          {isAdopt ? "I'm looking to adopt" : 'I manage a center'}
        </h2>
        <p className="text-sm text-white/75 mt-1.5">
          {isAdopt
            ? 'Find your perfect companion'
            : 'List animals, manage applications'}
        </p>
      </div>
      {/* Subtle paw texture on adopt panel */}
      {isAdopt && (
        <div className="absolute inset-0 opacity-10 pointer-events-none rounded-2xl overflow-hidden select-none" aria-hidden="true">
          {['top-4 left-4', 'top-8 right-8', 'bottom-6 left-10', 'bottom-4 right-4'].map((pos, i) => (
            <span key={i} className={`absolute text-3xl ${pos}`}>🐾</span>
          ))}
        </div>
      )}
    </button>
  );
}

/* ── Auth form container (shown after panel click) ───────────────── */
function AuthFormPanel({ role, onBack }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const isAdopt = role === 'adopt';

  const handleSuccess = (user) => {
    setUser(user);
    // Redirect to the correct page based on ACTUAL role from server
    if (user.role === 'owner') return navigate('/owner');
    if (user.role === 'center_admin') return navigate('/center');
    return navigate('/home');
  };

  return (
    <div
      className={`
        rounded-2xl p-8 shadow-soft-hover border
        ${isAdopt ? 'bg-background border-border' : 'bg-admin-bg border-border'}
      `}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-main transition-colors mb-6 focus:outline-none focus-visible:underline"
        aria-label="Go back to panel selection"
      >
        ← Back
      </button>

      {/* Role heading */}
      <div className="mb-6">
        <span className={`
          inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full
          ${isAdopt ? 'bg-accent-blush text-primary' : 'bg-admin-accent/10 text-admin-accent'}
        `}>
          {isAdopt ? '🐾 Adopter' : '🏠 Center Admin'}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold font-heading text-main">
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h1>
      </div>

      {/* Sign in / Sign up tabs */}
      <div className="flex gap-0.5 bg-border/40 rounded-lg p-1 mb-6">
        {['signin', 'signup'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`
              flex-1 py-1.5 text-sm font-medium rounded-md transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
              ${mode === m
                ? 'bg-white text-main shadow-sm'
                : 'text-muted hover:text-main'
              }
            `}
          >
            {m === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      {/* Actual forms */}
      {isAdopt ? (
        mode === 'signin'
          ? <AdopterSigninForm onSuccess={handleSuccess} />
          : <AdopterSignupForm onSuccess={handleSuccess} />
      ) : (
        mode === 'signin'
          ? <CenterSigninForm onSuccess={handleSuccess} />
          : <CenterSignupForm onSuccess={handleSuccess} />
      )}
    </div>
  );
}

/* ── Main LoginPage ──────────────────────────────────────────────── */
export default function LoginPage() {
  const [activePanel, setActivePanel] = useState(null); // null | 'adopt' | 'center'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <span className="text-4xl" aria-hidden="true">🐾</span>
        <h1 className="text-3xl font-extrabold font-heading text-main mt-1">Furry Tales</h1>
        <p className="text-muted text-sm mt-1">Where every animal has a story.</p>
      </div>

      <div className="w-full max-w-4xl">
        {activePanel === null ? (
          /* Role selection panels */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RolePanel role="adopt" onClick={() => setActivePanel('adopt')} />
            <RolePanel role="center" onClick={() => setActivePanel('center')} />
          </div>
        ) : (
          /* Auth form for selected role */
          <div className="max-w-md mx-auto">
            <AuthFormPanel role={activePanel} onBack={() => setActivePanel(null)} />
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-muted text-center">
        Furry Tales · Adoption for everyone
      </p>
    </div>
  );
}
