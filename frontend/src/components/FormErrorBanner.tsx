import { AlertIcon } from './icons';

export function FormErrorBanner({
  message,
}: {
  message: string | null | undefined;
}) {
  if (!message) return null;
  return (
    <div className="auth-error" role="alert">
      <AlertIcon size={18} />
      <span>{message}</span>
    </div>
  );
}