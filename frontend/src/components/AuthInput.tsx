import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
}

export function AuthInput({
  id,
  label,
  error,
  hint,
  className,
  ...inputProps
}: AuthInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = [error ? `${inputId}-error` : '', hint ? `${inputId}-hint` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="auth-field">
      <label className="auth-label bm-label-md" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={`auth-input ${className ?? ''}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {error ? (
        <p id={`${inputId}-error`} className="auth-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="auth-helper bm-label-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}