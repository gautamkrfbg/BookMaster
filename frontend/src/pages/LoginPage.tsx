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

interface LoginErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/home" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: LoginErrors = {};
    if (email.trim().length === 0) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email address.';
    }
    if (password.length === 0) {
      next.password = 'Password is required.';
    }
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) {
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully.');
      setLoading(false);
      navigate('/home', { replace: true });
    } catch (error) {
      setLoading(false);
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
      split="md"
      brand={
        <AuthBrandPanel
          headline={
            <>
              Exchange stories.
              <br />
              Discover new ones.
            </>
          }
          supporting="Give your books another reader and discover something new in return. Join our living library."
          showQuote
        />
      }
    >
      <MobileHeader />
      <div className="auth-heading">
        <h1 className="bm-headline-md">Welcome back</h1>
        <p className="bm-body-md auth-subheading">
          Sign in to continue your BookMaster journey.
        </p>
      </div>
      <FormErrorBanner message={formError} />
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          disabled={loading}
        />
        <AuthButton loading={loading} loadingText="Signing in...">
          Sign in
        </AuthButton>
      </form>
      <p className="auth-footer bm-body-md">
        Don&apos;t have an account?{' '}
        <Link className="auth-link" to="/register">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}