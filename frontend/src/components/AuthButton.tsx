import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function AuthButton({
  loading = false,
  loadingText,
  children,
  disabled,
  type = 'submit',
  ...buttonProps
}: AuthButtonProps) {
  return (
    <button
      type={type}
      className="btn-primary"
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}