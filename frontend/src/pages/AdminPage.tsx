import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiError, apiGet } from '../api/client';
import type { AdminStats } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import {
  ArrowRightIcon,
  BookIcon,
  CheckIcon,
  ClockIcon,
  ExchangeIcon,
  InfoIcon,
  ListIcon,
  PeopleIcon,
  TagsIcon,
} from '../components/icons';
import './admin.css';
import './dashboard.css';
import './library.css';

const STAT_META: { key: keyof AdminStats; label: string; icon: ReactNode }[] = [
  { key: 'users', label: 'Total users', icon: <PeopleIcon size={18} /> },
  { key: 'books', label: 'Books in catalog', icon: <BookIcon size={18} /> },
  { key: 'categories', label: 'Categories', icon: <TagsIcon size={18} /> },
  { key: 'listings', label: 'Active listings', icon: <ListIcon size={18} /> },
  { key: 'requests', label: 'Exchange requests', icon: <ExchangeIcon size={18} /> },
  { key: 'pendingRequests', label: 'Pending requests', icon: <ClockIcon size={18} /> },
  { key: 'exchangesCompleted', label: 'Completed exchanges', icon: <CheckIcon size={18} /> },
];

export function AdminPage() {
  const { session } = useAuth();
  const user = session?.user;
  const isAdmin = user?.role === 'ADMIN';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [denied, setDenied] = useState(false);

  const runFetch = useCallback(
    async (): Promise<AdminStats> => {
      const current = session;
      if (!current) throw new Error('No active session');
      return apiGet<AdminStats>('/admin/stats', current.token);
    },
    [session],
  );

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    runFetch()
      .then((result) => {
        if (!active) return;
        setStats(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setStats(null);
        if (err instanceof ApiError && err.status === 403) {
          setDenied(true);
        } else {
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runFetch, isAdmin]);

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin || denied) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main id="main" className="adm-denied">
          <section
            className="adm-denied__card"
            aria-labelledby="adm-denied-title"
            role="alert"
          >
            <span className="adm-denied__icon" aria-hidden="true">
              <InfoIcon size={22} />
            </span>
            <h1 id="adm-denied-title" className="bm-headline-md">
              Access restricted
            </h1>
            <p className="adm-denied__copy">
              You don&rsquo;t have permission to view this page.
            </p>
            <Link to="/dashboard" className="dash-cta dash-cta--primary">
              Return to Dashboard
              <ArrowRightIcon size={16} />
            </Link>
          </section>
        </main>
      </div>
    );
  }

  function handleRetry() {
    setLoading(true);
    setFailed(false);
    setStats(null);
    runFetch()
      .then((result) => {
        setStats(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) {
          setDenied(true);
        } else {
          setFailed(true);
        }
        setLoading(false);
      });
  }

  return (
    <div className="auth-layout">
      <AppNav />
      <main id="main" className="adm">
        <section className="lib-head">
          <div>
            <h1 className="bm-headline-md">Admin Dashboard</h1>
            <p className="lib-head__copy">Overview of activity across BookMaster.</p>
          </div>
          <span className="adm-role" aria-label="Role: admin">
            Admin
          </span>
        </section>

        {loading ? <AdminLoading /> : null}
        {!loading && failed ? <AdminError onRetry={handleRetry} /> : null}
        {!loading && !failed && stats ? <AdminContent stats={stats} /> : null}
      </main>
    </div>
  );
}

function AdminContent({ stats }: { stats: AdminStats }) {
  const total =
    stats.users +
    stats.books +
    stats.categories +
    stats.listings +
    stats.requests +
    stats.pendingRequests +
    stats.exchangesCompleted;

  if (!Number.isFinite(total) || total === 0) {
    return (
      <section className="empty" role="status">
        <h2 className="empty__title">No activity to show yet</h2>
        <p className="empty__copy">
          BookMaster statistics will appear here once users, books, listings, and
          exchanges start to build up.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="adm-grid" aria-label="BookMaster statistics">
        {STAT_META.map(({ key, label, icon }) => (
          <div key={key} className="adm-card">
            <span className="adm-card__icon" aria-hidden="true">
              {icon}
            </span>
            <div className="adm-card__value">{stats[key].toLocaleString()}</div>
            <div className="adm-card__label">{label}</div>
          </div>
        ))}
      </section>

      <section className="adm-glance" aria-labelledby="adm-glance-title">
        <h2 id="adm-glance-title" className="adm-glance__title">
          Exchanges
        </h2>
        <div className="adm-glance__row">
          <span>Exchange requests</span>
          <strong>{stats.requests.toLocaleString()}</strong>
          <em>({stats.pendingRequests.toLocaleString()} pending)</em>
        </div>
        <div className="adm-glance__row">
          <span>Completed exchanges</span>
          <strong>{stats.exchangesCompleted.toLocaleString()}</strong>
        </div>
      </section>

      <section className="adm-quick" aria-labelledby="adm-quick-title">
        <h2 id="adm-quick-title" className="adm-glance__title">
          Management
        </h2>
        <div className="adm-glance__row">
          <span>Add or remove books from the catalog</span>
          <Link className="dash-section__link" to="/admin/books">
            Open book catalog <ArrowRightIcon size={14} />
          </Link>
        </div>
        <div className="adm-glance__row">
          <span>View or add book categories</span>
          <Link className="dash-section__link" to="/admin/categories">
            Manage categories <ArrowRightIcon size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}

function AdminLoading() {
  return (
    <div className="adm-loading" aria-hidden="true">
      <div className="adm-loading__cards">
        {STAT_META.map(({ key }) => (
          <div key={key} className="skeleton adm-loading__card" />
        ))}
      </div>
      <div className="skeleton adm-loading__line" />
      <div className="skeleton adm-loading__line" />
    </div>
  );
}

function AdminError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="empty" role="alert">
      <h2 className="empty__title">Unable to load admin dashboard</h2>
      <p className="empty__copy">Something went wrong while loading the dashboard.</p>
      <button type="button" className="dash-cta dash-cta--primary" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}