import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { AuthBrandPanel } from '../components/AuthBrandPanel';
import { AuthButton } from '../components/AuthButton';
import { AuthInput } from '../components/AuthInput';
import { AuthLayout } from '../components/AuthLayout';
import { FormErrorBanner } from '../components/FormErrorBanner';
import { PasswordInput } from '../components/PasswordInput';
import { MobileHeader } from '../components/Wordmark';
import { isValidEmail } from '../lib/validate';
import { toast } from '../toast/toastBus';

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { session, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/home" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: RegisterErrors = {};
    if (name.trim().length === 0) {
      next.name = 'Name is required.';
    }
    if (email.trim().length === 0) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email address.';
    }
    if (password.length === 0) {
      next.password = 'Password is required.';
    } else if (password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    if (confirmPassword.length === 0) {
      next.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors(next);
    setFormError(null);
    if (
      next.name ||
      next.email ||
      next.password ||
      next.confirmPassword
    ) {
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created successfully.');
      setLoading(false);
      navigate('/home', { replace: true });
    } catch (error) {
      setLoading(false);
      if (error instanceof ApiError && error.status === 409) {
        setErrors((current) => ({ ...current, email: error.message }));
      }
      const message =
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.';
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <AuthLayout
      split="lg"
      brand={
        <AuthBrandPanel
          headline={
            <>
              Exchange stories.
              <br />
              Discover new ones.
            </>
          }
        />
      }
    >
      <MobileHeader />
      <div className="auth-heading">
        <h1 className="bm-headline-md">Create your account</h1>
        <p className="bm-body-md auth-subheading">
          Join BookMaster and give your books another reader.
        </p>
      </div>
      <FormErrorBanner message={formError} />
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthInput
          id="name"
          label="Full Name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Enter your full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          disabled={loading}
        />
        <AuthInput
          id="email"
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          disabled={loading}
        />
        <PasswordInput
          id="password"
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint="Password must be at least 6 characters"
          disabled={loading}
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
          disabled={loading}
        />
        <AuthButton loading={loading} loadingText="Creating account...">
          Create account
        </AuthButton>
      </form>
      <p className="auth-footer bm-body-md">
        Already have an account?{' '}
        <Link className="auth-link" to="/login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}