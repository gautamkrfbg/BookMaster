import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../api/client';
import type {
  BookListItem,
  CategoryItem,
  ExchangeListingItem,
  ExchangeRequestItem,
  UserListItem,
} from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '../components/icons';
import './dashboard.css';
import './book-details.css';

interface BookDetailsPayload {
  book: BookListItem;
  categoryName: string;
  listing: ExchangeListingItem | null;
  ownerName: string;
  requests: ExchangeRequestItem[];
}

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

function friendlyError(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.status !== 0 &&
    error.status < 500 &&
    error.message.length > 0
  ) {
    return error.message;
  }
  return 'Please try again.';
}

export function BookDetailsPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const myId = user ? Number(user.id) : -1;
  const activeId = id ?? '';

  const [payload, setPayload] = useState<BookDetailsPayload | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [chooserOpen, setChooserOpen] = useState(false);
  const [myBooks, setMyBooks] = useState<BookListItem[] | null>(null);
  const [libraryFailed, setLibraryFailed] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const runFetch = useCallback(async (): Promise<BookDetailsPayload> => {
    const book = await apiGet<BookListItem>(`/books/${id}`);
    const [categories, listings, requests, owner] = await Promise.all([
      apiGet<CategoryItem[]>('/categories'),
      apiGet<ExchangeListingItem[]>('/exchangelistings?pageSize=200'),
      apiGet<ExchangeRequestItem[]>('/exchangerequests'),
      apiGet<UserListItem>(`/users/${book.ownerId}`),
    ]);
    const categoryName = categories.find((c) => c.id === book.categoryId)?.name ?? 'Book';
    const listing = listings.find((l) => l.bookId === book.id) ?? null;
    return { book, categoryName, listing, ownerName: owner.name, requests };
  }, [id]);

  useEffect(() => {
    let active = true;
    runFetch().then(
      (result) => {
        if (!active) return;
        setSent(false);
        setChooserOpen(false);
        setSelectedBookId(null);
        setSubmitError(null);
        setMyBooks(null);
        setLibraryFailed(false);
        setPayload(result);
        setLoadedId(activeId);
      },
      (error: unknown) => {
        if (!active) return;
        setSent(false);
        setChooserOpen(false);
        setSelectedBookId(null);
        setSubmitError(null);
        setMyBooks(null);
        setLibraryFailed(false);
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        } else {
          setFailed(true);
        }
        setLoadedId(activeId);
      },
    );
    return () => {
      active = false;
    };
  }, [runFetch, activeId]);

  function retry() {
    runFetch().then(
      (result) => {
        setPayload(result);
        setLoadedId(activeId);
      },
      () => setFailed(true),
    );
  }

  function openChooser() {
    setChooserOpen(true);
    setMyBooks(null);
    setLibraryFailed(false);
    setSelectedBookId(null);
    setSubmitError(null);
    apiGet<BookListItem[]>(`/users/${myId}/library`).then(
      (books) => setMyBooks(books),
      () => {
        setLibraryFailed(true);
        setMyBooks([]);
      },
    );
  }

  function closeChooser() {
    setChooserOpen(false);
    setSubmitError(null);
  }

  async function handleOfferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedBookId === null || !payload?.listing || !token) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiPost<ExchangeRequestItem>(
        '/exchangerequests',
        { listingId: payload.listing.id, offeredBookId: selectedBookId },
        token,
      );
      setSent(true);
    } catch (error) {
      setSubmitError(`Unable to send exchange request. ${friendlyError(error)}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  const loading = loadedId !== activeId;

  if (loading) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="bd">
          <span className="skeleton" style={{ height: 16, width: 160, display: 'block' }} />
          <section className="bd-hero" aria-hidden="true">
            <div className="bd-coverwrap">
              <span className="skeleton bd-cover-skel" />
            </div>
            <div className="bd-info">
              <span className="skeleton" style={{ height: 12, width: 110, display: 'block' }} />
              <span
                className="skeleton"
                style={{ height: 36, width: '72%', marginTop: 16, display: 'block' }}
              />
              <span
                className="skeleton"
                style={{ height: 14, width: 160, marginTop: 18, display: 'block' }}
              />
              <span
                className="skeleton"
                style={{ height: 30, width: 200, marginTop: 22, display: 'block' }}
              />
            </div>
          </section>
          <p className="visually-hidden" role="status">
            Loading book details
          </p>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="bd">
          <Link className="bd-back" to="/marketplace">
            <ArrowLeftIcon size={15} />
            <span>Back to Marketplace</span>
          </Link>
          <section className="empty" role="alert" aria-labelledby="bd-404-title">
            <h2 id="bd-404-title" className="empty__title">
              Book not found
            </h2>
            <p className="empty__copy">
              This book may have been removed or is no longer available.
            </p>
            <Link className="dash-cta dash-cta--primary" to="/marketplace">
              Back to Marketplace
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (failed || !payload) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="bd">
          <section className="empty" role="alert" aria-labelledby="bd-error-title">
            <h2 id="bd-error-title" className="empty__title">
              Unable to load book
            </h2>
            <p className="empty__copy">Something went wrong while loading this book.</p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={retry}>
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  const book = payload.book;
  const listing = payload.listing;
  const requests = payload.requests;
  const isMine = book.ownerId === myId;

  const myRequest =
    listing && !isMine
      ? requests.find((r) => r.listingId === listing.id && r.requesterId === myId)
      : undefined;
  const myRequestPending = myRequest?.status === 'PENDING';

  const canRequest =
    !!listing && !isMine && book.status === 'LISTED' && !myRequestPending;

  const eligible = (myBooks ?? []).filter(
    (b) => b.status === 'OWNED' && b.id !== book.id,
  );

  let badgeLabel = 'Not listed';
  let badgeTone = 'owned';
  if (book.status === 'EXCHANGED') {
    badgeLabel = 'Exchanged';
    badgeTone = 'exchanged';
  } else if (canRequest) {
    badgeLabel = 'Available';
    badgeTone = 'listed';
  } else if (myRequestPending) {
    badgeLabel = 'Request pending';
    badgeTone = 'pending';
  } else if (isMine) {
    badgeLabel = 'Your book';
    badgeTone = 'owned';
  }

  let sub = 'This book isn’t listed for exchange right now.';
  if (canRequest) {
    sub = `Looking for ${listing?.wantedType ?? 'a trade'}. Choose one of your books to offer in return.`;
  } else if (myRequestPending) {
    sub = `You’ve already sent a request for this book. Looking for ${listing?.wantedType ?? 'a trade'}.`;
  } else if (isMine && book.status === 'LISTED') {
    sub = `You listed this book. Looking for ${listing?.wantedType ?? 'a trade'}.`;
  } else if (isMine && book.status === 'EXCHANGED') {
    sub = 'This book has already been exchanged.';
  } else if (isMine) {
    sub = 'This is your book. It isn’t listed for exchange yet.';
  } else if (book.status === 'EXCHANGED') {
    sub = 'This book has already been exchanged and is no longer available.';
  }

  return (
    <div className="auth-layout">
      <AppNav />
      <main className="bd">
        <Link className="bd-back" to="/marketplace">
          <ArrowLeftIcon size={15} />
          <span>Back to Marketplace</span>
        </Link>

        <section className="bd-hero" aria-labelledby="bd-title">
          <div className="bd-coverwrap">
            <div
              className={`book-cover bd-cover book-cover--${toneClass(book.id)}`}
              role="img"
              aria-label={`Cover placeholder for ${book.title}`}
            >
              <span className="book-cover__initial bd-cover__initial" aria-hidden="true">
                {initialOf(book.title)}
              </span>
              <span className="book-cover__tag" aria-hidden="true">
                BookMaster
              </span>
            </div>
            <p className="bd-covernote">Cover not available</p>
          </div>

          <div className="bd-info">
            <p className="bd-eyebrow">{payload.categoryName}</p>
            <h1 id="bd-title" className="bd-title">
              {book.title}
            </h1>

            <div className="bd-meta" role="status">
              <span className={`pill pill--${badgeTone}`}>{badgeLabel}</span>
            </div>

            <p className="bd-sub">{sub}</p>

            {listing && !isMine ? (
              <div className="bd-owner">
                <span className="bd-owner__label">Listed by</span>
                <span className="bd-owner__name">{payload.ownerName}</span>
              </div>
            ) : null}

            {sent ? (
              <section className="bd-note" role="status" aria-labelledby="bd-sent-title">
                <h2 id="bd-sent-title" className="bd-note__title">
                  <span className="bd-note__icon" aria-hidden="true">
                    <CheckIcon size={20} />
                  </span>
                  Exchange request sent
                </h2>
                <p className="bd-note__copy">
                  Your request has been sent successfully. The owner of “{book.title}” will
                  review your offer.
                </p>
                <div className="dash-actions">
                  <Link className="dash-cta dash-cta--primary" to="/requests">
                    View requests <ArrowRightIcon size={15} />
                  </Link>
                  <Link className="dash-cta dash-cta--ghost" to="/marketplace">
                    Back to Marketplace
                  </Link>
                </div>
              </section>
            ) : canRequest ? (
              <div className="bd-actions">
                {chooserOpen ? (
                  <form className="bd-offer" onSubmit={handleOfferSubmit}>
                    <h3 className="bd-offer__title">Choose a book to offer</h3>
                    <p className="bd-offer__copy">
                      You’ll offer one of your own books in exchange for “{book.title}”. Only
                      books sitting in your library can be offered.
                    </p>

                    {libraryFailed ? (
                      <p className="bd-offer__empty" role="alert">
                        Unable to load your library. Please try again.
                      </p>
                    ) : myBooks === null ? (
                      <div className="bd-offer__list" aria-hidden="true">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="bd-offer__item">
                            <span className="skeleton" style={{ width: 36, height: 54 }} />
                            <span
                              className="skeleton"
                              style={{ height: 14, width: 160, display: 'block' }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : eligible.length === 0 ? (
                      <p className="bd-offer__empty">
                        You don’t have any books available to offer. Add books to your library
                        first.
                      </p>
                    ) : (
                      <div className="bd-offer__list" role="radiogroup" aria-label="Books you can offer">
                        {eligible.map((candidate) => (
                          <label
                            key={candidate.id}
                            className={`bd-offer__item${
                              selectedBookId === candidate.id ? ' bd-offer__item--selected' : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name="offeredBook"
                              value={candidate.id}
                              checked={selectedBookId === candidate.id}
                              onChange={() => setSelectedBookId(candidate.id)}
                              className="visually-hidden"
                            />
                            <span
                              className={`bd-offer__tile book-cover--${toneClass(candidate.id)}`}
                              aria-hidden="true"
                            >
                              {initialOf(candidate.title)}
                            </span>
                            <span className="bd-offer__tile-text">
                              <span className="bd-offer__tile-title">{candidate.title}</span>
                              <span className="pill pill--owned bd-offer__tile-pill">
                                Available
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {submitError ? (
                      <p className="bd-offer__error" role="alert">
                        {submitError}
                      </p>
                    ) : null}

                    <div className="dash-actions">
                      <button
                        type="submit"
                        className="dash-cta dash-cta--primary bd-request"
                        disabled={submitting || selectedBookId === null || eligible.length === 0}
                      >
                        {submitting ? 'Sending…' : 'Request exchange'}
                      </button>
                      <button
                        type="button"
                        className="dash-cta dash-cta--ghost"
                        onClick={closeChooser}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="dash-cta dash-cta--primary bd-request"
                      onClick={openChooser}
                    >
                      Request exchange
                    </button>
                    <p className="bd-actions__hint">
                      Choose one of your books to offer. The owner will review your request
                      before any exchange happens.
                    </p>
                  </>
                )}
              </div>
            ) : myRequestPending ? (
              <div className="bd-actions bd-actions--status">
                <p className="bd-statusmsg">
                  Request pending — you’ll be notified when the owner responds.
                </p>
                <Link className="dash-section__link" to="/requests">
                  View requests
                </Link>
              </div>
            ) : isMine ? (
              <div className="bd-actions bd-actions--status">
                <p className="bd-statusmsg">
                  {book.status === 'LISTED'
                    ? 'Incoming requests for this book appear on your Requests page.'
                    : 'Books can only be requested once they’re listed for exchange.'}
                </p>
              </div>
            ) : (
              <div className="bd-actions bd-actions--status">
                <p className="bd-statusmsg">
                  {book.status === 'EXCHANGED'
                    ? 'This book has been exchanged and is no longer available.'
                    : 'This book isn’t listed for exchange right now.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}