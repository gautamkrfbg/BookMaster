import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import type {
  BookListItem,
  CategoryItem,
  ExchangeListingItem,
  ExchangeRequestItem,
  HistoryItem,
  UserListItem,
} from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { ArrowDownIcon } from '../components/icons';
import './dashboard.css';
import './library.css';
import './history.css';

interface HistoryPayload {
  history: HistoryItem[];
  requests: ExchangeRequestItem[];
  listings: ExchangeListingItem[];
  books: BookListItem[];
  categories: CategoryItem[];
  users: UserListItem[];
}

interface HistoryRow {
  key: number;
  id: number;
  completedAt: string | null;
  title: string;
  bookId: number;
  offeredTitle: string;
  offeredBookId: number;
  categoryName: string;
  participantName?: string;
  receivedTone: string;
  offeredTone: string;
}

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function HistoryPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const myId = user ? Number(user.id) : -1;

  const [payload, setPayload] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const runFetch = useCallback(async (): Promise<HistoryPayload> => {
    const [history, requests, listings, books, categories, users] = await Promise.all([
      apiGet<HistoryItem[]>(`/users/${myId}/exchange-history`),
      apiGet<ExchangeRequestItem[]>('/exchangerequests'),
      apiGet<ExchangeListingItem[]>('/exchangelistings?pageSize=200'),
      apiGet<BookListItem[]>('/books?pageSize=200'),
      apiGet<CategoryItem[]>('/categories'),
      apiGet<UserListItem[]>('/users'),
    ]);
    return { history, requests, listings, books, categories, users };
  }, [myId]);

  useEffect(() => {
    let active = true;
    runFetch().then(
      (result) => {
        if (!active) return;
        setPayload(result);
        setFailed(false);
      },
      () => {
        if (!active) return;
        setFailed(true);
        setPayload(null);
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
        setPayload(result);
        setFailed(false);
      },
      () => {
        setFailed(true);
        setPayload(null);
      },
    ).finally(() => setLoading(false));
  }

  const rows = useMemo((): HistoryRow[] => {
    if (!payload) return [];
    const requestsById = new Map(payload.requests.map((r) => [r.id, r]));
    const listingsById = new Map(payload.listings.map((l) => [l.id, l]));
    const booksById = new Map(payload.books.map((b) => [b.id, b]));
    const categoriesById = new Map(payload.categories.map((c) => [c.id, c]));
    const usersById = new Map(payload.users.map((u) => [u.id, u]));

    const acc: HistoryRow[] = [];
    for (const entry of payload.history) {
      const request = requestsById.get(entry.requestId);
      if (!request || request.status !== 'ACCEPTED' || request.requesterId !== myId) continue;
      const listing = listingsById.get(request.listingId);
      const received = listing ? booksById.get(listing.bookId) : undefined;
      const offered = booksById.get(request.offeredBookId);
      if (!received || !offered) continue;
      const participant = usersById.get(offered.ownerId);
      acc.push({
        key: entry.id,
        id: entry.id,
        completedAt: entry.completedAt,
        title: received.title,
        bookId: received.id,
        offeredTitle: offered.title,
        offeredBookId: offered.id,
        categoryName: categoriesById.get(received.categoryId)?.name ?? 'Book',
        participantName: participant?.name,
        receivedTone: toneClass(received.id),
        offeredTone: toneClass(offered.id),
      });
    }
    acc.sort((a, b) => {
      const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return tb - ta;
    });
    return acc;
  }, [payload, myId]);

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="lib">
          <div className="skeleton" style={{ height: 40, width: 320 }} />
          <div className="skeleton" style={{ height: 16, width: 460, marginTop: 12 }} />
          <div className="hx-list" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="hx-skel-card">
                <span className="skeleton hx-skel-cover" />
                <div className="hx-skel-body">
                  <span className="skeleton" style={{ height: 11, width: 90, display: 'block' }} />
                  <span className="skeleton" style={{ height: 18, width: '62%', display: 'block' }} />
                  <span className="skeleton" style={{ height: 12, width: 120, display: 'block' }} />
                  <span className="skeleton" style={{ height: 44, width: '70%', display: 'block' }} />
                </div>
                <span className="skeleton" style={{ height: 34, width: 110, display: 'block' }} />
              </div>
            ))}
          </div>
          <p className="visually-hidden" role="status">
            Loading your exchange history
          </p>
        </main>
      </div>
    );
  }

  if (failed || !payload) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="lib">
          <section className="empty" role="alert" aria-labelledby="hx-error-title">
            <h2 id="hx-error-title" className="empty__title">
              Unable to load exchange history
            </h2>
            <p className="empty__copy">
              Something went wrong while loading your exchange history.
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
      <AppNav />
      <main className="lib" aria-labelledby="hx-heading">
        <section className="lib-head">
          <div>
            <h1 id="hx-heading" className="bm-headline-md lib-head__title">
              Exchange History
            </h1>
            <p className="bm-body-lg lib-head__copy">
              A record of the books you’ve exchanged with other readers.
            </p>
          </div>
        </section>

        {rows.length === 0 ? (
          <section className="empty" aria-labelledby="hx-empty-title">
            <h2 id="hx-empty-title" className="empty__title">
              No exchanges yet
            </h2>
            <p className="empty__copy">
              Your completed book exchanges will appear here. Find a book in the marketplace and
              start your first exchange.
            </p>
            <Link className="dash-cta dash-cta--primary" to="/marketplace">
              Explore marketplace
            </Link>
          </section>
        ) : (
          <>
            <ol className="hx-list">
              {rows.map((row) => (
                <HistoryRowView key={row.key} row={row} />
              ))}
            </ol>
            <p className="hx-meta" role="status">
              {rows.length} {rows.length === 1 ? 'exchange' : 'exchanges'} in your history.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function HistoryRowView({ row }: { row: HistoryRow }) {
  const dateText = row.completedAt ? formatDate(row.completedAt) : '';

  return (
    <li className="hx-item">
      <article className="hx-card">
        <Link
          className="hx-cover-wrap"
          to={`/books/${row.bookId}`}
          aria-label={`View ${row.title}`}
          tabIndex={-1}
        >
          <div className={`book-cover hx-cover book-cover--${row.receivedTone}`} aria-hidden="true">
            <span className="book-cover__initial hx-cover__initial">{initialOf(row.title)}</span>
            <span className="book-cover__tag">BookMaster</span>
          </div>
        </Link>

        <div className="hx-body">
          <p className="hx-eyebrow">{row.categoryName}</p>
          <h3 className="hx-title">
            <Link className="hx-title__link" to={`/books/${row.bookId}`}>
              {row.title}
            </Link>
          </h3>
          <span className="hx-flow" aria-hidden="true">
            <ArrowDownIcon size={12} />
          </span>
          <div className="hx-gave">
            <span
              className={`hx-gave__tile book-cover--${row.offeredTone}`}
              aria-hidden="true"
            >
              {initialOf(row.offeredTitle)}
            </span>
            <p className="hx-label">
              You gave ·{' '}
              <Link className="hx-gave__link" to={`/books/${row.offeredBookId}`}>
                {row.offeredTitle}
              </Link>
            </p>
          </div>
          <p className="hx-with">
            Exchanged with <span className="hx-with__name">{row.participantName ?? 'another reader'}</span>
          </p>
        </div>

        <div className="hx-date">
          <p className="hx-date__label">Exchanged</p>
          {dateText ? (
            <time className="hx-date__value" dateTime={row.completedAt ?? undefined}>
              {dateText}
            </time>
          ) : (
            <span className="hx-date__value hx-date__value--muted">Date unavailable</span>
          )}
        </div>
      </article>
    </li>
  );
}