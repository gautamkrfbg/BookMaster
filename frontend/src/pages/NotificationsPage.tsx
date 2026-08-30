import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';
import type { NotificationItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { BellIcon } from '../components/icons';
import { toast } from '../toast/toastBus';
import './dashboard.css';
import './library.css';
import './notifications.css';

export function NotificationsPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;

  const [notes, setNotes] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set());

  const runFetch = useCallback(async (): Promise<NotificationItem[]> => {
    const current = session;
    if (!current) {
      throw new Error('No session');
    }
    return apiGet<NotificationItem[]>(
      `/users/${Number(current.user.id)}/notifications`,
      current.token,
    );
  }, [session]);

  useEffect(() => {
    let active = true;
    runFetch().then(
      (result) => {
        if (!active) return;
        setNotes(result);
        setFailed(false);
      },
      () => {
        if (!active) return;
        setFailed(true);
        setNotes(null);
      },
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [runFetch]);

  function retry() {
    setLoading(true);
    setFailed(false);
    runFetch().then(
      (result) => {
        setNotes(result);
        setFailed(false);
      },
      () => {
        setFailed(true);
        setNotes(null);
      },
    ).finally(() => setLoading(false));
  }

  const sorted = useMemo(() => {
    if (!notes) return [];
    return [...notes].sort((a, b) => b.id - a.id);
  }, [notes]);

  const unread = useMemo(
    () => (notes ?? []).filter((n) => !n.isRead).length,
    [notes],
  );

  async function handleMarkRead(note: NotificationItem) {
    if (!session || busy.has(note.id)) return;
    setBusy((prev) => new Set(prev).add(note.id));
    try {
      await apiPost(`/notifications/${note.id}/read`, {}, session.token);
      setNotes((prev) =>
        (prev ?? []).map((n) => (n.id === note.id ? { ...n, isRead: true } : n)),
      );
    } catch {
      toast.error('Could not mark this notification as read. Please try again.');
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
    }
  }

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="lib">
          <div className="skeleton" style={{ height: 40, width: 300 }} />
          <div className="skeleton" style={{ height: 16, width: 460, marginTop: 12 }} />
          <div className="ntf-list" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ntf-skel-row">
                <span className="skeleton ntf-skel-dot" />
                <span className="skeleton ntf-skel-icon" />
                <span className="skeleton ntf-skel-title" />
                <span className="skeleton ntf-skel-pill" />
              </div>
            ))}
          </div>
          <p className="visually-hidden" role="status">
            Loading your notifications
          </p>
        </main>
      </div>
    );
  }

  if (failed || !notes) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="lib">
          <section className="empty" role="alert" aria-labelledby="ntf-error-title">
            <h2 id="ntf-error-title" className="empty__title">
              Unable to load notifications
            </h2>
            <p className="empty__copy">
              Something went wrong while loading your notifications.
            </p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={retry}>
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <AppNav unreadCount={unread} />
      <main className="lib" aria-labelledby="ntf-heading">
        <section className="lib-head">
          <div>
            <h1 id="ntf-heading" className="bm-headline-md lib-head__title">
              Notifications
            </h1>
            <p className="bm-body-lg lib-head__copy">
              Stay up to date with activity related to your BookMaster account.
            </p>
          </div>
        </section>

        {sorted.length === 0 ? (
          <section className="empty" aria-labelledby="ntf-empty-title">
            <h2 id="ntf-empty-title" className="empty__title">
              You’re all caught up
            </h2>
            <p className="empty__copy">
              New notifications will appear here when there’s activity on your account.
            </p>
          </section>
        ) : (
          <ul className="ntf-list" aria-label="Notifications">
            {sorted.map((note) => (
              <li
                key={note.id}
                className={`ntf-row${note.isRead ? ' ntf-row--read' : ' ntf-row--unread'}`}
              >
                <span
                  className={`ntf-row__dot${note.isRead ? '' : ' ntf-row__dot--unread'}`}
                  aria-hidden="true"
                />
                <span className="ntf-icon" aria-hidden="true">
                  <BellIcon size={16} />
                </span>
                <p className="ntf-title">Exchange activity update</p>
                <div className="ntf-side">
                  <span className={`pill pill--${note.isRead ? 'read' : 'unread'}`}>
                    {note.isRead ? 'READ' : 'UNREAD'}
                  </span>
                  {!note.isRead ? (
                    <button
                      type="button"
                      className="ntf-mark"
                      onClick={() => handleMarkRead(note)}
                      disabled={busy.has(note.id)}
                    >
                      {busy.has(note.id) ? 'Marking…' : 'Mark as read'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {sorted.length > 0 ? (
          <p className="ntf-meta" role="status">
            {sorted.length} {sorted.length === 1 ? 'notification' : 'notifications'} ·{' '}
            {unread} unread
          </p>
        ) : null}

        <p className="visually-hidden" role="status">
          {sorted.length === 0
            ? 'You have no notifications'
            : `${unread} unread notification${unread === 1 ? '' : 's'}`}
        </p>
      </main>
    </div>
  );
}