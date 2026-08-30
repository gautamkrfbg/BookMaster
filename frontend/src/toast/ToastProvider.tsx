import { useEffect, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from '../components/icons';
import { subscribeToasts } from './toastBus';
import type { ToastItem, ToastKind } from './toastBus';

const DURATION_MS: Record<ToastKind, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
};

type State = ToastItem[];
type Action = { type: 'add'; toast: ToastItem } | { type: 'remove'; id: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const exists = state.some(
        (t) => t.kind === action.toast.kind && t.message === action.toast.message,
      );
      if (exists) return state;
      return [...state, action.toast];
    }
    case 'remove':
      return state.filter((t) => t.id !== action.id);
  }
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') return <CheckIcon size={18} />;
  if (kind === 'error') return <AlertIcon size={18} />;
  return <InfoIcon size={18} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  const timersRef = useRef(new Map<number, number>());

  useEffect(() => {
    const timers = timersRef.current;
    const unsubscribe = subscribeToasts((incoming) => {
      dispatch({ type: 'add', toast: incoming });
      const existing = timers.get(incoming.id);
      if (existing) window.clearTimeout(existing);
      const timer = window.setTimeout(
        () => dispatch({ type: 'remove', id: incoming.id }),
        DURATION_MS[incoming.kind],
      );
      timers.set(incoming.id, timer);
    });
    return () => {
      unsubscribe();
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  function hide(id: number) {
    const timers = timersRef.current;
    const timer = timers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.delete(id);
    }
    dispatch({ type: 'remove', id });
  }

  return (
    <>
      {children}
      <div className="bm-toasts" role="region" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bm-toast bm-toast--${t.kind}`}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            <span className="bm-toast__icon">
              <ToastIcon kind={t.kind} />
            </span>
            <span className="bm-toast__body">{t.message}</span>
            <button
              type="button"
              className="bm-toast__close"
              aria-label="Dismiss notification"
              onClick={() => hide(t.id)}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}