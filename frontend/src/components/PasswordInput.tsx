import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
}

export function PasswordInput({
  id,
  label,
  error,
  hint,
  autoComplete,
  className,
  ...inputProps
}: PasswordInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const describedBy = [error ? `${inputId}-error` : '', hint ? `${inputId}-hint` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="auth-field">
      <label className="auth-label bm-label-md" htmlFor={inputId}>
        {label}
      </label>
      <div className="auth-password">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`auth-input ${className ?? ''}`.trim()}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="auth-eye"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </div>
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