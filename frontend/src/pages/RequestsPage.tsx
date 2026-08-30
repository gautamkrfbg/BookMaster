import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';
import type {
  BookListItem,
  CategoryItem,
  ExchangeListingItem,
  ExchangeRequestItem,
  UserListItem,
} from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { CheckIcon, CloseIcon } from '../components/icons';
import './dashboard.css';
import './library.css';
import './requests.css';

interface RequestsPayload {
  books: BookListItem[];
  categories: CategoryItem[];
  listings: ExchangeListingItem[];
  requests: ExchangeRequestItem[];
  users: UserListItem[];
}

interface EnrichedRequest extends ExchangeRequestItem {
  requestedBook?: BookListItem;
  offeredBook?: BookListItem;
  requesterName?: string;
  categoryName?: string;
}

type TabKey = 'incoming' | 'outgoing';
type ActionKind = 'accept' | 'reject';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

function statusRank(status: string): number {
  if (status === 'ACCEPTED') return 1;
  if (status === 'REJECTED') return 2;
  return 0;
}

export function RequestsPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const myId = user ? Number(user.id) : -1;

  const [payload, setPayload] = useState<RequestsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [tab, setTab] = useState<TabKey>('incoming');

  const [pendingAction, setPendingAction] = useState<{
    request: EnrichedRequest;
    kind: ActionKind;
  } | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<{
    kind: ActionKind;
    requestedTitle: string;
    offeredTitle: string;
  } | null>(null);

  const runFetch = useCallback(async (): Promise<RequestsPayload> => {
    const [books, categories, listings, requests, users] = await Promise.all([
      apiGet<BookListItem[]>('/books?pageSize=200'),
      apiGet<CategoryItem[]>('/categories'),
      apiGet<ExchangeListingItem[]>('/exchangelistings?pageSize=200'),
      apiGet<ExchangeRequestItem[]>('/exchangerequests'),
      apiGet<UserListItem[]>('/users'),
    ]);
    return { books, categories, listings, requests, users };
  }, []);

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

  function refresh() {
    runFetch().then(
      (result) => {
        setPayload(result);
        setFailed(false);
      },
      () => {
        setFailed(true);
        setPayload(null);
      },
    );
  }

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

  const derived = useMemo<{ incoming: EnrichedRequest[]; outgoing: EnrichedRequest[] }>(() => {
    if (!payload) return { incoming: [], outgoing: [] };
    const booksById = new Map(payload.books.map((b) => [b.id, b]));
    const categoriesById = new Map(payload.categories.map((c) => [c.id, c]));
    const usersById = new Map(payload.users.map((u) => [u.id, u]));
    const listingsById = new Map(payload.listings.map((l) => [l.id, l]));

    const enriched: EnrichedRequest[] = payload.requests
      .map((r) => {
        const listing = listingsById.get(r.listingId);
        const requestedBook = listing ? booksById.get(listing.bookId) : undefined;
        return {
          ...r,
          requestedBook,
          offeredBook: booksById.get(r.offeredBookId),
          requesterName: usersById.get(r.requesterId)?.name,
          categoryName: requestedBook
            ? categoriesById.get(requestedBook.categoryId)?.name
            : undefined,
        };
      })
      .filter((r) => r.requestedBook !== undefined);

    const incoming: EnrichedRequest[] = [];
    const outgoing: EnrichedRequest[] = [];
    for (const request of enriched) {
      if (request.requesterId === myId) {
        outgoing.push(request);
        continue;
      }
      const ownsListedBook = request.requestedBook?.ownerId === myId;
      const receivedOfferedBook =
        request.status === 'ACCEPTED' && request.offeredBook?.ownerId === myId;
      if (ownsListedBook || receivedOfferedBook) incoming.push(request);
    }

    const compare = (a: EnrichedRequest, b: EnrichedRequest) =>
      statusRank(a.status) - statusRank(b.status) || b.id - a.id;
    incoming.sort(compare);
    outgoing.sort(compare);

    return { incoming, outgoing };
  }, [payload, myId]);

  function ask(kind: ActionKind, request: EnrichedRequest) {
    setPendingAction({ request, kind });
    setActing(false);
    setActionError(null);
  }

  function closeDialog() {
    if (acting) return;
    setPendingAction(null);
    setActionError(null);
  }

  async function confirmAction() {
    if (!pendingAction || !token) return;
    const { request, kind } = pendingAction;
    setActing(true);
    setActionError(null);
    try {
      await apiPost(`/exchangerequests/${request.id}/${kind}`, {}, token);
      setSuccessNote({
        kind,
        requestedTitle: request.requestedBook?.title ?? 'the requested book',
        offeredTitle: request.offeredBook?.title ?? 'the offered book',
      });
      setPendingAction(null);
      refresh();
    } catch {
      setActionError('Unable to update this request. Please try again.');
    } finally {
      setActing(false);
    }
  }

  function onTabKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    switch (event.key) {
      case 'ArrowRight':
        setTab((tabs[(index + 1) % tabs.length].dataset.tab ?? 'incoming') as TabKey);
        tabs[(index + 1) % tabs.length].focus();
        break;
      case 'ArrowLeft': {
        const previous = (index - 1 + tabs.length) % tabs.length;
        setTab((tabs[previous].dataset.tab ?? 'incoming') as TabKey);
        tabs[previous].focus();
        break;
      }
      case 'Home':
        setTab((tabs[0].dataset.tab ?? 'incoming') as TabKey);
        tabs[0].focus();
        break;
      case 'End':
        setTab((tabs[tabs.length - 1].dataset.tab ?? 'incoming') as TabKey);
        tabs[tabs.length - 1].focus();
        break;
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
          <div className="skeleton" style={{ height: 40, width: 320 }} />
          <div className="skeleton" style={{ height: 16, width: 460, marginTop: 12 }} />
          <div className="skeleton" style={{ height: 44, width: 280, marginTop: 32 }} />
          <div className="rq-list" style={{ marginTop: 20 }} aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rq-skel-card">
                <span className="skeleton rq-skel-cover" />
                <div className="rq-card__body">
                  <span className="skeleton" style={{ height: 11, width: 120, display: 'block' }} />
                  <span className="skeleton" style={{ height: 18, width: '62%', marginTop: 6, display: 'block' }} />
                  <span className="skeleton" style={{ height: 13, width: '46%', marginTop: 6, display: 'block' }} />
                  <span className="skeleton" style={{ height: 44, width: 200, marginTop: 10, display: 'block' }} />
                </div>
                <div className="rq-card__aside">
                  <span className="skeleton" style={{ height: 24, width: 76, display: 'block' }} />
                  <span className="skeleton" style={{ height: 36, width: 120, display: 'block' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="visually-hidden" role="status">
            Loading your requests
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
          <section className="empty" role="alert" aria-labelledby="rq-error-title">
            <h2 id="rq-error-title" className="empty__title">
              Unable to load requests
            </h2>
            <p className="empty__copy">
              Something went wrong while loading your exchange requests.
            </p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={retry}>
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  const incoming = derived.incoming;
  const outgoing = derived.outgoing;
  const overallEmpty = incoming.length === 0 && outgoing.length === 0;
  const activeList = tab === 'incoming' ? incoming : outgoing;

  return (
    <div className="auth-layout">
      <AppNav />
      <main className="lib" aria-labelledby="rq-heading">
        <section className="lib-head">
          <div>
            <h1 id="rq-heading" className="bm-headline-md lib-head__title">
              Exchange Requests
            </h1>
            <p className="bm-body-lg lib-head__copy">
              Keep track of books you’ve requested and requests from other readers.
            </p>
          </div>
        </section>

        {successNote ? (
          <section className="rq-note" role="status" aria-labelledby="rq-note-title">
            <span className="rq-note__icon" aria-hidden="true">
              <CheckIcon size={18} />
            </span>
            <p className="rq-note__text" id="rq-note-title">
              <strong>
                {successNote.kind === 'accept' ? 'Request accepted' : 'Request rejected'}
              </strong>
              <span>
                {successNote.kind === 'accept'
                  ? `“${successNote.requestedTitle}” and “${successNote.offeredTitle}” have been exchanged.`
                  : `The request for “${successNote.requestedTitle}” was declined.`}
              </span>
            </p>
          </section>
        ) : null}

        {overallEmpty ? (
          <section className="empty" aria-labelledby="rq-activity-empty-title">
            <h2 id="rq-activity-empty-title" className="empty__title">
              Your exchange activity starts here
            </h2>
            <p className="empty__copy">
              Browse the marketplace to find a book you’d like to exchange.
            </p>
            <Link className="dash-cta dash-cta--primary" to="/marketplace">
              Explore books
            </Link>
          </section>
        ) : (
          <>
            <div className="rq-tabs" role="tablist" aria-label="Exchange requests" onKeyDown={onTabKey}>
              <button
                type="button"
                role="tab"
                id="rq-tab-incoming"
                className={`rq-tab${tab === 'incoming' ? ' rq-tab--active' : ''}`}
                aria-selected={tab === 'incoming'}
                aria-controls="rq-panel"
                data-tab="incoming"
                onClick={() => setTab('incoming')}
              >
                Incoming
                <span className="rq-tab__count" aria-label={`${incoming.length} incoming`}>
                  {incoming.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                id="rq-tab-outgoing"
                className={`rq-tab${tab === 'outgoing' ? ' rq-tab--active' : ''}`}
                aria-selected={tab === 'outgoing'}
                aria-controls="rq-panel"
                data-tab="outgoing"
                onClick={() => setTab('outgoing')}
              >
                Outgoing
                <span className="rq-tab__count" aria-label={`${outgoing.length} outgoing`}>
                  {outgoing.length}
                </span>
              </button>
            </div>

            <section
              className="rq-panel"
              id="rq-panel"
              role="tabpanel"
              aria-labelledby={tab === 'incoming' ? 'rq-tab-incoming' : 'rq-tab-outgoing'}
            >
              {activeList.length === 0 ? (
                tab === 'incoming' ? (
                  <section className="empty" aria-labelledby="rq-incoming-empty-title">
                    <h2 id="rq-incoming-empty-title" className="empty__title">
                      No incoming requests
                    </h2>
                    <p className="empty__copy">
                      When someone requests one of your listed books, their request will appear
                      here.
                    </p>
                  </section>
                ) : (
                  <section className="empty" aria-labelledby="rq-outgoing-empty-title">
                    <h2 id="rq-outgoing-empty-title" className="empty__title">
                      No outgoing requests
                    </h2>
                    <p className="empty__copy">
                      Books you request from the marketplace will appear here.
                    </p>
                    <Link className="dash-cta dash-cta--primary" to="/marketplace">
                      Browse marketplace
                    </Link>
                  </section>
                )
              ) : (
                <div className="rq-list">
                  {activeList.map((request) => (
                    <RequestCardView
                      key={request.id}
                      request={request}
                      myId={myId}
                      busy={acting}
                      onAsk={ask}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {pendingAction ? (
        <RequestActionDialog
          request={pendingAction.request}
          kind={pendingAction.kind}
          acting={acting}
          error={actionError}
          onConfirm={confirmAction}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}

function RequestCardView({
  request,
  myId,
  busy,
  onAsk,
}: {
  request: EnrichedRequest;
  myId: number;
  busy: boolean;
  onAsk: (kind: ActionKind, request: EnrichedRequest) => void;
}) {
  const requested = request.requestedBook;
  const offered = request.offeredBook;
  const isOutgoing = request.requesterId === myId;
  const canDecide = request.status === 'PENDING' && requested?.ownerId === myId;
  const requestedTitle = requested?.title ?? 'a listed book';
  const offeredTitle = offered?.title ?? 'a book in return';

  return (
    <article className="rq-card">
      <div
        className={`book-cover rq-cover book-cover--${toneClass(requested?.id ?? request.id)}`}
        aria-hidden="true"
      >
        <span className="book-cover__initial rq-cover__initial">
          {initialOf(requested?.title ?? 'Book')}
        </span>
        <span className="book-cover__tag">BookMaster</span>
      </div>

      <div className="rq-card__body">
        <p className="rq-eyebrow">{request.categoryName ?? 'Book'}</p>
        <h3 className="rq-card__title">
          {requested ? (
            <Link className="rq-card__link" to={`/books/${requested.id}`}>
              {requested.title}
            </Link>
          ) : (
            requestedTitle
          )}
        </h3>
        <p className="rq-card__who">
          {isOutgoing
            ? 'You requested this book'
            : `Requested by ${request.requesterName ?? 'another reader'}`}
        </p>
        <div className="rq-offer">
          <span
            className={`rq-offer__tile book-cover--${toneClass(offered?.id ?? request.offeredBookId)}`}
            aria-hidden="true"
          >
            {offered ? initialOf(offered.title) : '?'}
          </span>
          <span className="rq-offer__text">
            <span className="rq-offer__label">{isOutgoing ? 'Your offer' : 'Their offer'}</span>
            {offered ? (
              <Link className="rq-offer__link" to={`/books/${offered.id}`}>
                <span className="rq-offer__title">{offered.title}</span>
              </Link>
            ) : (
              <span className="rq-offer__title">{offeredTitle}</span>
            )}
          </span>
        </div>
      </div>

      <div className="rq-card__aside">
        <span className={`pill pill--${request.status.toLowerCase()} rq-card__pill`}>
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
        {canDecide ? (
          <div className="rq-card__actions">
            <button
              type="button"
              className="dash-cta dash-cta--primary rq-action"
              onClick={() => onAsk('accept', request)}
              disabled={busy}
            >
              Accept
            </button>
            <button
              type="button"
              className="dash-cta dash-cta--ghost rq-action"
              onClick={() => onAsk('reject', request)}
              disabled={busy}
            >
              Reject
            </button>
          </div>
        ) : (
          <p className="rq-card__statusnote">
            {request.status === 'PENDING' && isOutgoing
              ? 'Request pending'
              : request.status === 'ACCEPTED'
                ? 'Exchange accepted'
                : request.status === 'REJECTED'
                  ? 'Request declined'
                  : ''}
          </p>
        )}
      </div>
    </article>
  );
}

function RequestActionDialog({
  request,
  kind,
  acting,
  error,
  onConfirm,
  onClose,
}: {
  request: EnrichedRequest;
  kind: ActionKind;
  acting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const accepting = kind === 'accept';
  const requested = request.requestedBook;
  const offered = request.offeredBook;
  const requestedTitle = requested?.title ?? 'the requested book';
  const offeredTitle = offered?.title ?? 'the offered book';
  const requester = request.requesterName ?? 'The requester';

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !acting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [acting, onClose]);

  const copy = accepting
    ? `Accepting will exchange “${requestedTitle}” for “${offeredTitle}”. ${requester} will receive “${requestedTitle}” and you’ll receive “${offeredTitle}”. Any other pending requests for this book will be declined.`
    : `Rejecting declines ${requester}’s request for “${requestedTitle}”. “${offeredTitle}” stays with ${requester}.`;

  return (
    <div
      className="bm-modal"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !acting) onClose();
      }}
    >
      <section
        className="bm-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rq-action-title"
      >
        <header className="bm-modal__head">
          <h2 id="rq-action-title" className="bm-headline-sm bm-modal__title">
            {accepting ? 'Accept this exchange request?' : 'Reject this exchange request?'}
          </h2>
          <button
            type="button"
            className="bm-modal__close"
            aria-label="Close"
            onClick={onClose}
            disabled={acting}
          >
            <CloseIcon size={16} />
          </button>
        </header>

        <p className="bm-modal__copy">{copy}</p>

        <div className="rq-dialog__summary">
          <div className="rq-dialog__row">
            <span
              className={`rq-dialog__row-tile book-cover--${toneClass(requested?.id ?? 0)}`}
              aria-hidden="true"
            >
              {requested ? initialOf(requested.title) : '?'}
            </span>
            <span className="rq-dialog__row-text">
              <span className="rq-dialog__row-label">Requested</span>
              <span className="rq-dialog__row-title">{requestedTitle}</span>
            </span>
          </div>
          <div className="rq-dialog__row">
            <span
              className={`rq-dialog__row-tile book-cover--${toneClass(offered?.id ?? 0)}`}
              aria-hidden="true"
            >
              {offered ? initialOf(offered.title) : '?'}
            </span>
            <span className="rq-dialog__row-text">
              <span className="rq-dialog__row-label">Offered</span>
              <span className="rq-dialog__row-title">{offeredTitle}</span>
            </span>
          </div>
        </div>

        {error ? (
          <p className="bm-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="bm-modal__actions">
          <button
            type="button"
            className="dash-cta dash-cta--ghost"
            onClick={onClose}
            disabled={acting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dash-cta dash-cta--primary"
            onClick={onConfirm}
            disabled={acting}
            autoFocus
          >
            {acting
              ? accepting
                ? 'Accepting…'
                : 'Rejecting…'
              : accepting
                ? 'Accept request'
                : 'Reject request'}
          </button>
        </div>
      </section>
    </div>
  );
}