import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError, apiPut } from '../api/client';
import type { AuthUser } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { ArrowRightIcon, LogoutIcon } from '../components/icons';
import { PasswordInput } from '../components/PasswordInput';
import { isValidEmail } from '../lib/validate';
import { toast } from '../toast/toastBus';
import './dashboard.css';
import './library.css';
import './profile.css';

interface ProfileErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const ACCOUNT_LINKS = [
  { to: '/library', label: 'My Library', copy: 'Books you own' },
  { to: '/listings', label: 'My Listings', copy: 'Books you’re offering for exchange' },
  { to: '/requests', label: 'Requests', copy: 'Incoming and outgoing exchange requests' },
  { to: '/history', label: 'Exchange History', copy: 'Your completed exchanges' },
  { to: '/notifications', label: 'Notifications', copy: 'Updates about your account activity' },
] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${second}`.toUpperCase() || 'B';
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

export function ProfilePage() {
  const { session, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const user = session?.user ?? null;
  const myId = user ? Number(user.id) : -1;

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  function startEditing(u: AuthUser) {
    setDraftName(u.name);
    setDraftEmail(u.email);
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setFormError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraftName('');
    setDraftEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setFormError(null);
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
    token: string,
  ) {
    event.preventDefault();

    const next: ProfileErrors = {};
    if (draftName.trim().length === 0) {
      next.name = 'Name is required.';
    }
    if (draftEmail.trim().length === 0) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(draftEmail)) {
      next.email = 'Enter a valid email address.';
    }
    if (newPassword.length > 0 && newPassword.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    if (newPassword.length > 0 && confirmPassword !== newPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors(next);
    setFormError(null);
    if (next.name || next.email || next.password || next.confirmPassword) {
      return;
    }

    const payload: { name: string; email: string; password?: string } = {
      name: draftName,
      email: draftEmail,
    };
    if (newPassword.length > 0) {
      payload.password = newPassword;
    }

    setSaving(true);
    try {
      await apiPut(`/users/${myId}`, payload, token);
      const normalized: Partial<AuthUser> = {
        name: draftName.trim(),
        email: draftEmail.trim().toLowerCase(),
      };
      updateUser(normalized);
      toast.success('Profile updated successfully.');
      setEditing(false);
      setDraftName('');
      setDraftEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors((current) => ({ ...current, email: error.message }));
        setFormError(error.message);
      } else if (error instanceof ApiError && error.status === 400) {
        if (/name/i.test(error.message)) {
          setErrors((current) => ({ ...current, name: error.message }));
        } else if (/password/i.test(error.message)) {
          setErrors((current) => ({ ...current, password: error.message }));
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Unable to update your profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    logout();
    toast.info('You have been signed out.');
    navigate('/login', { replace: true });
  }

  return (
    <div className="auth-layout">
      <AppNav />
      <main className="lib" aria-labelledby="prf-heading">
        <section className="lib-head">
          <div>
            <h1 id="prf-heading" className="bm-headline-md lib-head__title">
              Your Profile
            </h1>
            <p className="bm-body-lg lib-head__copy">
              Manage your BookMaster account information.
            </p>
          </div>
        </section>

        <section className="prf-hero" aria-label="Account overview">
          <span className={`prf-avatar book-cover--${toneClass(myId)}`} aria-hidden="true">
            {initialsOf(user.name)}
          </span>
          <div className="prf-hero__id">
            <h2 className="bm-headline-sm prf-hero__name">{user.name}</h2>
            <p className="prf-hero__email">{user.email}</p>
          </div>
          <span className="prf-role">{user.role}</span>
        </section>

        <section className="prf-card" aria-labelledby="prf-account-heading">
          <div className="prf-card__head">
            <div>
              <h2 id="prf-account-heading" className="bm-headline-sm prf-card__title">
                Account information
              </h2>
              <p className="prf-card__copy">
                Details associated with your BookMaster account.
              </p>
            </div>
            {!editing ? (
              <button
                type="button"
                className="dash-cta dash-cta--ghost dash-cta--small"
                onClick={() => startEditing(user)}
              >
                Edit profile
              </button>
            ) : null}
          </div>

          {editing ? (
            <form className="prf-form" onSubmit={(event) => handleSave(event, session.token)} noValidate>
              <div className="auth-field">
                <label className="auth-label bm-label-md" htmlFor="prf-name">
                  Full Name
                </label>
                <input
                  id="prf-name"
                  className="auth-input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={255}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'prf-name-error' : undefined}
                  disabled={saving}
                />
                {errors.name ? (
                  <p id="prf-name-error" className="auth-field__error" role="alert">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div className="auth-field">
                <label className="auth-label bm-label-md" htmlFor="prf-email">
                  Email address
                </label>
                <input
                  id="prf-email"
                  className="auth-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={255}
                  value={draftEmail}
                  onChange={(event) => setDraftEmail(event.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'prf-email-error' : undefined}
                  disabled={saving}
                />
                {errors.email ? (
                  <p id="prf-email-error" className="auth-field__error" role="alert">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="prf-password">
                <PasswordInput
                  id="prf-new-password"
                  label="New password"
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder="Optional"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  error={errors.password}
                  hint="Leave blank to keep your current password."
                  disabled={saving}
                />
                <PasswordInput
                  id="prf-confirm-password"
                  label="Confirm new password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  error={errors.confirmPassword}
                  disabled={saving}
                />
              </div>

              {formError ? (
                <p className="prf-form-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="prf-actions">
                <button
                  type="submit"
                  className="dash-cta dash-cta--primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="dash-cta dash-cta--ghost"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="prf-list">
              <div className="prf-list__row">
                <dt className="prf-list__label">Name</dt>
                <dd className="prf-list__value">{user.name}</dd>
              </div>
              <div className="prf-list__row">
                <dt className="prf-list__label">Email</dt>
                <dd className="prf-list__value">{user.email}</dd>
              </div>
              <div className="prf-list__row">
                <dt className="prf-list__label">Role</dt>
                <dd className="prf-list__value">
                  <span className="prf-role">{user.role}</span>
                </dd>
              </div>
            </dl>
          )}
        </section>

        <section className="prf-card" aria-labelledby="prf-nav-heading">
          <div className="prf-card__head">
            <div>
              <h2 id="prf-nav-heading" className="bm-headline-sm prf-card__title">
                Account &amp; activity
              </h2>
              <p className="prf-card__copy">
                Jump to your books, requests, history and notifications.
              </p>
            </div>
          </div>
          <ul className="prf-links">
            {ACCOUNT_LINKS.filter(
              (link) =>
                user?.role !== 'ADMIN' ||
                (link.to !== '/library' &&
                  link.to !== '/listings' &&
                  link.to !== '/requests'),
            ).map((link) => (
              <li key={link.to} className="prf-link-row">
                <Link className="prf-link" to={link.to}>
                  <span className="prf-link__text">
                    <span className="prf-link__label">{link.label}</span>
                    <span className="prf-link__copy">{link.copy}</span>
                  </span>
                  <ArrowRightIcon size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="prf-signout" aria-labelledby="prf-signout-heading">
          <div>
            <h2 id="prf-signout-heading" className="bm-headline-sm prf-signout__title">
              Sign out
            </h2>
            <p className="prf-signout__copy">End your session on this device.</p>
          </div>
          <button
            type="button"
            className="prf-signout__button"
            onClick={handleSignOut}
          >
            <LogoutIcon size={16} />
            Sign out
          </button>
        </section>
      </main>
    </div>
  );
}