import type { ReactNode } from 'react';

interface AuthLayoutProps {
  /** Brand panel split breakpoint. Sign In = 'md', Sign Up = 'lg' (per Stitch). */
  split: 'md' | 'lg';
  brand: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ split, brand, children }: AuthLayoutProps) {
  return (
    <div className={`auth-layout auth-layout--split-${split}`}>
      {brand ? <aside className="auth-brand">{brand}</aside> : null}
      <main className="auth-main">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}