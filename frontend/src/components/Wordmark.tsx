import { BrandMark } from './icons';

interface WordmarkProps {
  className?: string;
}

export function Wordmark({ className = '' }: WordmarkProps) {
  return (
    <div className={`auth-brand__logo ${className}`.trim()}>
      <BrandMark size={30} />
      <span className="bm-headline-sm">BookMaster</span>
    </div>
  );
}

export function MobileHeader() {
  return (
    <div className="auth-mobile-header">
      <BrandMark size={30} />
      <span className="bm-headline-sm">BookMaster</span>
    </div>
  );
}