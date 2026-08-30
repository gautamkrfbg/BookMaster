import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import type {
  BookListItem,
  CategoryItem,
  ExchangeListingItem,
  ExchangeRequestItem,
  HistoryItem,
  NotificationItem,
  UserListItem,
} from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { AlertIcon, ArrowRightIcon } from '../components/icons';
import './dashboard.css';

interface DashboardPayload {
  users: UserListItem[];
  categories: CategoryItem[];
  books: BookListItem[];
  listings: ExchangeListingItem[];
  requests: ExchangeRequestItem[];
  history: HistoryItem[];
  library: BookListItem[];
  notifications: NotificationItem[];
}

interface EnrichedRequest extends ExchangeRequestItem {
  listingBook?: BookListItem;
  offeredBook?: BookListItem;
  requesterName?: string;
}

interface ActivityItem {
  key: string;
  icon: 'incoming' | 'outgoing' | 'accepted' | 'completed';
  title: string;
  description: string;
  dateLabel?: string;
  href?: string;
  pillLabel: string;
  pillTone: 'pending' | 'accepted';
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

function requestedActivityLabel(request: EnrichedRequest, myId: number): string {
  const listingTitle = request.listingBook?.title ?? 'a listed book';
  const requester = request.requesterName ?? 'A reader';
  if (request.requesterId === myId) {
    return `Your request for \u00AB${listingTitle}\u00BB was accepted.`;
  }
  return `You accepted ${requester}'s request for \u00AB${listingTitle}\u00BB.`;
}

export function DashboardPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const myId = user ? Number(user.id) : -1;

  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const runFetch = useCallback(async (): Promise<DashboardPayload> => {
    const current = session;
    if (!current) {
      throw new Error('No session');
    }
    const currentUserId = Number(current.user.id);
    const [users, categories, books, listings, requests, history, library, notifications] =
      await Promise.all([
        apiGet<UserListItem[]>('/users'),
        apiGet<CategoryItem[]>('/categories'),
        apiGet<BookListItem[]>('/books?pageSize=200'),
        apiGet<ExchangeListingItem[]>('/exchangelistings?pageSize=200'),
        apiGet<ExchangeRequestItem[]>('/exchangerequests'),
        apiGet<HistoryItem[]>(`/users/${currentUserId}/exchange-history`),
        apiGet<BookListItem[]>(`/users/${currentUserId}/library`),
        apiGet<NotificationItem[]>(`/users/${currentUserId}/notifications`, current.token),
      ]);
    return {
      users,
      categories,
      books,
      listings,
      requests,
      history,
      library,
      notifications,
    };
  }, [session]);

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

  const derived = useMemo(() => {
    if (!payload) return null;
    const booksById = new Map(payload.books.map((b) => [b.id, b]));
    const usersById = new Map(payload.users.map((u) => [u.id, u]));
    const categoriesById = new Map(payload.categories.map((c) => [c.id, c]));
    const listingById = new Map(payload.listings.map((l) => [l.id, l]));

    const requests: EnrichedRequest[] = payload.requests.map((r) => {
      const listing = listingById.get(r.listingId);
      const listingBook = listing ? booksById.get(listing.bookId) : undefined;
      return {
        ...r,
        listingBook,
        offeredBook: booksById.get(r.offeredBookId),
        requesterName: usersById.get(r.requesterId)?.name,
      };
    });

    const isOwner = (book?: BookListItem) => book?.ownerId === myId;

    const incomingPending = requests.filter(
      (r) => r.status === 'PENDING' && isOwner(r.listingBook),
    );
    const outgoingPending = requests.filter(
      (r) => r.status === 'PENDING' && r.requesterId === myId,
    );
    const acceptedMine = requests.filter(
      (r) =>
        r.status === 'ACCEPTED' &&
        (r.requesterId === myId || isOwner(r.listingBook)),
    );

    const myListings = payload.listings.filter(
      (l) => booksById.get(l.bookId)?.ownerId === myId,
    );

    const discover = payload.listings
      .filter((l) => booksById.get(l.bookId)?.ownerId !== myId)
      .slice(0, 4)
      .map((listing) => {
        const book = booksById.get(listing.bookId);
        return {
          listing,
          book,
          category: book
            ? categoriesById.get(book.categoryId)
            : undefined,
        };
      });

    const requestsById = new Map(requests.map((r) => [r.id, r]));
    const historyEntries = payload.history
      .map((h) => ({ ...h, request: requestsById.get(h.requestId) }))
      .filter((h): h is HistoryItem & { request: EnrichedRequest } => Boolean(h.request));

    const activities: ActivityItem[] = [
      ...historyEntries.map((h): ActivityItem => {
        const title = h.request.listingBook?.title ?? '';
        const offered = h.request.offeredBook?.title ?? '';
        const description =
          title && offered ? `\u00AB${title}\u00BB swapped for \u00AB${offered}\u00BB` : 'An exchange was completed.';
        return {
          key: `history-${h.id}`,
          icon: 'completed',
          title: 'Exchange completed',
          description,
          dateLabel: h.completedAt ? formatDate(h.completedAt) : undefined,
          pillLabel: 'COMPLETED',
          pillTone: 'accepted',
        };
      }),
      ...acceptedMine.map(
        (r): ActivityItem => ({
          key: `accepted-${r.id}`,
          icon: 'accepted',
          title: 'Exchange accepted',
          description: requestedActivityLabel(r, myId),
          href: '/requests',
          pillLabel: 'ACCEPTED',
          pillTone: 'accepted',
        }),
      ),
      ...incomingPending.map(
        (r): ActivityItem => ({
          key: `incoming-${r.id}`,
          icon: 'incoming',
          title: 'Incoming request',
          description: `${r.requesterName ?? 'A reader'} wants your ${r.listingBook?.title ?? 'listed book'}.`,
          href: '/requests',
          pillLabel: 'PENDING',
          pillTone: 'pending',
        }),
      ),
      ...outgoingPending.map(
        (r): ActivityItem => ({
          key: `outgoing-${r.id}`,
          icon: 'outgoing',
          title: 'Outgoing request',
          description: `You requested ${r.listingBook?.title ?? 'a book'}.`,
          href: '/requests',
          pillLabel: 'PENDING',
          pillTone: 'pending',
        }),
      ),
    ];
    activities.sort((a, b) => {
      const dateA = a.dateLabel ?? '';
      const dateB = b.dateLabel ?? '';
      return dateB.localeCompare(dateA);
    });

    return {
      myBooks: payload.library,
      myListings,
      incomingPending,
      outgoingPending,
      acceptedMine,
      discover,
      historyEntries,
      activities,
      unread: payload.notifications.filter((n) => !n.isRead).length,
      recentNotifications: payload.notifications.slice(0, 3),
      pendingCount: incomingPending.length + outgoingPending.length,
      completedCount: historyEntries.length,
      categoryName: (id: number) => categoriesById.get(id)?.name ?? 'Book',
    };
  }, [payload, myId]);

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <DashboardShell unreadCount={0}>
        <section className="dash-loading" aria-label="Loading your dashboard">
          <div className="skeleton" style={{ height: 44, width: 320 }} />
          <div className="skeleton" style={{ height: 20, width: 220 }} />
          <div className="dash-loading__cards" aria-hidden="true">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          <div className="dash-loading__grid" aria-hidden="true">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </section>
      </DashboardShell>
    );
  }

  if (failed || !derived) {
    return (
      <DashboardShell>
        <div className="dash-error">
          <div className="dash-error__box" role="alert">
            <AlertIcon size={44} />
            <h1 className="dash-error__title">Unable to load your dashboard</h1>
            <p className="dash-error__copy">Please try again.</p>
<button
          type="button"
          className="dash-cta dash-cta--primary"
          onClick={retry}
        >
          Try again
        </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const firstName = user.name.trim().split(' ')[0] || user.name;
  const {
    myBooks,
    myListings,
    incomingPending,
    outgoingPending,
    discover,
    activities,
    unread,
    recentNotifications,
    pendingCount,
    completedCount,
    categoryName,
  } = derived;

  return (
    <DashboardShell unreadCount={unread}>
      <div className="dash">
        <section className="dash-head" aria-labelledby="dash-heading">
          <div>
            <h1 id="dash-heading" className="bm-headline-md dash-head__greeting">
              {greeting()}, {firstName}
            </h1>
            <p className="bm-body-lg dash-head__copy">Ready to find your next book?</p>
          </div>
          <div className="dash-head__actions">
            <Link className="dash-cta dash-cta--primary" to="/marketplace">
              Explore books
            </Link>
            <Link className="dash-cta dash-cta--ghost" to="/library">
              Add a book
            </Link>
          </div>
        </section>

        <section className="overview" aria-label="Quick overview">
          <OverviewCard count={myBooks.length} label="My Books" to="/library" />
          <OverviewCard count={myListings.length} label="Active Listings" to="/listings" />
          <OverviewCard count={pendingCount} label="Pending Requests" to="/requests" />
          <OverviewCard count={completedCount} label="Completed Exchanges" to="/requests" />
        </section>

        <section className="dash-section" aria-labelledby="discover-heading">
          <SectionHead
            id="discover-heading"
            title="Discover books"
            copy="Find books available for exchange from other readers."
            link={{ to: '/marketplace', label: 'Browse marketplace' }}
          />
          {discover.length === 0 ? (
            <div className="empty">
              <p className="empty__title">No books are listed for exchange yet.</p>
              <p className="empty__copy">
                Check back soon — new listings appear as readers join.
              </p>
            </div>
          ) : (
            <div className="discover-grid">
              {discover.map(({ listing, book, category }) => (
                <BookCard
                  key={listing.id}
                  title={book?.title ?? 'Untitled book'}
                  category={category?.name}
                  isListed={Boolean(book)}
                  wantedType={listing.wantedType}
                  tone={toneClass(listing.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="dash-section" aria-labelledby="library-heading">
          <SectionHead
            id="library-heading"
            title="My Library"
            link={{ to: '/library', label: 'View my library' }}
          />
          {myBooks.length === 0 ? (
            <div className="empty">
              <p className="empty__title">Your library is waiting for its first book.</p>
              <p className="empty__copy">
                Add a book to start building your collection.
              </p>
              <Link className="dash-cta dash-cta--ghost dash-cta--small" to="/library">
                Add a book
              </Link>
            </div>
          ) : (
            <>
              <ul className="lib-list">
                {myBooks.slice(0, 3).map((book) => (
                  <li key={book.id} className="lib-row">
                    <span
                      className={`skeleton lib-row__thumb book-cover--${toneClass(book.id)}`}
                      aria-hidden="true"
                    >
                      {initialOf(book.title)}
                    </span>
                    <span className="lib-row__info">
                      <span className="lib-row__title">{book.title}</span>
                      <span className="lib-row__category">
                        {categoryName(book.categoryId)}
                      </span>
                    </span>
                    <span className={`pill pill--${book.status.toLowerCase()} lib-row__pill`}>
                      {book.status}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="dash-actions">
                <Link className="dash-cta dash-cta--ghost dash-cta--small" to="/library">
                  Add a book
                </Link>
                <Link className="dash-section__link" to="/library">
                  View my library
                </Link>
              </div>
            </>
          )}
        </section>

        <div className="dash-cols">
          <section className="dash-section dash-section--narrow" aria-labelledby="activity-heading">
            <SectionHead id="activity-heading" title="Exchange activity" />
            {activities.length === 0 ? (
              <div className="empty">
                <p className="empty__title">No recent exchange activity yet.</p>
                <p className="empty__copy">Start by exploring the marketplace.</p>
                <Link className="dash-cta dash-cta--ghost dash-cta--small" to="/marketplace">
                  Browse marketplace
                </Link>
              </div>
            ) : (
              <ul className="activity-list">
                {activities.slice(0, 5).map((item) => (
                  <ActivityRow key={item.key} item={item} />
                ))}
              </ul>
            )}
          </section>

          <div className="dash-section dash-section--narrow" aria-label="Requests and notifications">
            <section aria-labelledby="requests-heading">
              <SectionHead id="requests-heading" title="Requests" />
              {incomingPending.length + outgoingPending.length === 0 ? (
                <div className="empty">
                  <p className="empty__title">No exchange requests yet.</p>
                  <p className="empty__copy">Browse the marketplace to discover books.</p>
                </div>
              ) : (
                <>
                  <div className="requests-split">
                    <RequestsColumn
                      label="Incoming"
                      count={incomingPending.length}
                      rows={incomingPending.slice(0, 2).map((r) => ({
                        key: r.id,
                        main: `${r.requesterName ?? 'A reader'} wants your ${r.listingBook?.title ?? 'listed book'}`,
                        offering: `Offering: ${r.offeredBook?.title ?? 'a book'}`,
                      }))}
                    />
                    <RequestsColumn
                      label="Outgoing"
                      count={outgoingPending.length}
                      rows={outgoingPending.slice(0, 2).map((r) => ({
                        key: r.id,
                        main: `You requested ${r.listingBook?.title ?? 'a book'}`,
                        offering: `Offering: ${r.offeredBook?.title ?? 'a book'}`,
                      }))}
                    />
                  </div>
                  <div className="dash-actions">
                    <Link className="dash-cta dash-cta--ghost dash-cta--small" to="/requests">
                      View requests
                    </Link>
                  </div>
                </>
              )}
            </section>

            <section
              id="dashboard-notifications"
              className="dash-section dash-section--narrow"
              aria-labelledby="notes-heading"
            >
              <SectionHead
                id="notes-heading"
                title="Notifications"
                copy={
                  recentNotifications.length > 0
                    ? `${unread} unread`
                    : 'No notifications yet.'
                }
              />
              {recentNotifications.length === 0 ? (
                <div className="empty">
                  <p className="empty__title">No notifications yet.</p>
                  <p className="empty__copy">
                    Notifications about your exchanges will appear here.
                  </p>
                </div>
              ) : (
                <ul className="notes-list">
                  {recentNotifications.map((note) => (
                    <li key={note.id} className="note-row">
                      <span
                        className={`note-row__dot${note.isRead ? '' : ' note-row__dot--unread'}`}
                        aria-hidden="true"
                      />
                      <span className="note-row__text">Exchange activity update</span>
                      <span className={`pill pill--${note.isRead ? 'read' : 'unread'}`}>
                        {note.isRead ? 'READ' : 'UNREAD'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function DashboardShell({
  unreadCount,
  children,
}: {
  unreadCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="auth-layout">
      <AppNav unreadCount={unreadCount} />
      {children}
    </div>
  );
}

function OverviewCard({ count, label, to }: { count: number; label: string; to: string }) {
  return (
    <Link className="overview-card" to={to}>
      <span className="bm-headline-md overview-card__count">{count}</span>
      <span className="bm-body-md overview-card__label">{label}</span>
      <span className="overview-card__go">
        Open <ArrowRightIcon size={14} />
      </span>
    </Link>
  );
}

function SectionHead({
  id,
  title,
  copy,
  link,
}: {
  id: string;
  title: string;
  copy?: string;
  link?: { to: string; label: string };
}) {
  return (
    <div className="dash-section__head">
      <div>
        <h2 id={id} className="bm-headline-sm dash-section__title">
          {title}
        </h2>
        {copy ? <p className="bm-body-md dash-section__copy">{copy}</p> : null}
      </div>
      {link ? (
        <Link className="dash-section__link" to={link.to}>
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}

function BookCard({
  title,
  category,
  isListed,
  wantedType,
  tone,
}: {
  title: string;
  category?: string;
  isListed: boolean;
  wantedType: string;
  tone: string;
}) {
  return (
    <article className="book-card">
      <div className={`book-cover book-cover--${tone}`} aria-hidden="true">
        <span className="book-cover__initial">{initialOf(title)}</span>
        <span className="book-cover__tag">BookMaster</span>
      </div>
      <div className="book-card__body">
        <h3 className="book-card__title">{title}</h3>
        <p className="book-card__meta">{category ? category : 'Book'}</p>
        {isListed ? (
          <p className="book-card__wanted">Looking for: {wantedType}</p>
        ) : null}
      </div>
      <div className="book-card__foot">
        <Link className="dash-section__link" to="/marketplace">
          View book
        </Link>
      </div>
    </article>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const body = (
    <>
      <span className={`activity-row__icon activity-row__icon--${item.icon}`} aria-hidden="true">
        <ArrowRightIcon size={16} />
      </span>
      <div className="activity-row__body">
        <div className="activity-row__title">{item.title}</div>
        <div className="activity-row__desc">{item.description}</div>
      </div>
      <div className="activity-row__side">
        {item.dateLabel ? <span className="activity-row__date">{item.dateLabel}</span> : null}
        <span className={`pill pill--${item.pillTone}`}>{item.pillLabel}</span>
      </div>
    </>
  );
  return (
    <li className="activity-row">
      {item.href ? (
        <Link className="activity-row__link" to={item.href}>
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

function RequestsColumn({
  label,
  count,
  rows,
}: {
  label: string;
  count: number;
  rows: { key: number; main: string; offering: string }[];
}) {
  return (
    <div>
      <div className="requests-col__head">
        <span className="bm-label-md">{label}</span>
        <span className="requests-col__count" aria-label={`${count} ${label.toLowerCase()}`}>
          {count}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="bm-body-md dash-section__copy">Nothing pending.</p>
      ) : (
        rows.map((row) => (
          <div key={row.key} className="request-row">
            <span className="request-row__main">{row.main}</span>
            <span className="request-row__offering">{row.offering}</span>
          </div>
        ))
      )}
    </div>
  );
}