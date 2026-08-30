import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import type { BookListItem, CategoryItem, ExchangeListingItem, ExchangeRequestItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { CheckIcon, PlusIcon, SearchIcon } from '../components/icons';
import { ListBookDialog } from '../components/ListBookDialog';
import { purchasedBookIds } from '../lib/purchases';
import './dashboard.css';
import './library.css';
import './listings.css';

interface ListingsPayload {
  books: BookListItem[];
  categories: CategoryItem[];
  listings: ExchangeListingItem[];
  requests: ExchangeRequestItem[];
  purchased: BookListItem[];
}

interface ListingCard {
  key: number;
  listingId: number;
  bookId: number;
  title: string;
  categoryName: string;
  status: string;
  wantedType: string;
  tone: string;
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'LISTED', label: 'Listed' },
  { key: 'EXCHANGED', label: 'Exchanged' },
] as const;

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

export function ListingsPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const myId = user ? Number(user.id) : -1;

  const [payload, setPayload] = useState<ListingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [listedNote, setListedNote] = useState(false);

  const runFetch = useCallback(async (): Promise<ListingsPayload> => {
    const [books, categories, listings, requests, purchased] = await Promise.all([
      apiGet<BookListItem[]>(`/users/${myId}/library`, token),
      apiGet<CategoryItem[]>('/categories'),
      apiGet<ExchangeListingItem[]>('/exchangelistings?pageSize=200'),
      apiGet<ExchangeRequestItem[]>('/exchangerequests', token),
      Promise.all(
        purchasedBookIds(myId).map(async (bookId) => {
          try {
            return await apiGet<BookListItem>(`/books/${bookId}`);
          } catch {
            return null;
          }
        }),
      ),
    ]);
    return {
      books,
      categories,
      listings,
      requests,
      purchased: purchased.filter((p): p is BookListItem => p !== null),
    };
  }, [myId, token]);

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

  function refreshListings() {
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

  function openPicker() {
    setPickerOpen(true);
  }

  function handleListed() {
    setPickerOpen(false);
    setListedNote(true);
    refreshListings();
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  function clearSearch() {
    setDraft('');
    setQuery('');
  }

  function clearFilter() {
    setStatusFilter('ALL');
    setCategoryFilter(null);
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
          <div className="lib-summary" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="lib-stat">
                <span className="skeleton" style={{ height: 30, width: 48, display: 'block' }} />
                <span className="skeleton" style={{ height: 12, width: 72, display: 'block' }} />
              </div>
            ))}
          </div>
          <div className="discover-grid" style={{ marginTop: 32 }} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="book-card book-card--skeleton">
                <span className="skeleton" style={{ aspectRatio: '2 / 3' }} />
                <span className="skeleton" style={{ height: 16, marginTop: 14 }} />
                <span className="skeleton" style={{ height: 12, marginTop: 8, width: '60%' }} />
              </div>
            ))}
          </div>
          <p className="visually-hidden" role="status">
            Loading your listings
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
          <section className="empty" role="alert" aria-labelledby="ls-error-title">
            <h2 id="ls-error-title" className="empty__title">
              Unable to load your listings
            </h2>
            <p className="empty__copy">Something went wrong while loading your exchange listings.</p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={retry}>
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  const books = payload.books;
  const categoriesById = new Map(payload.categories.map((c) => [c.id, c]));
  const listingsByBook = new Map(payload.listings.map((l) => [l.bookId, l]));
  const myListingIds = new Set<number>();

  const cards: ListingCard[] = [];
  for (const listing of payload.listings) {
    const book = books.find((b) => b.id === listing.bookId);
    if (!book) continue;
    if (book.status !== 'LISTED' && book.status !== 'EXCHANGED') continue;
    myListingIds.add(listing.id);
    cards.push({
      key: listing.id,
      listingId: listing.id,
      bookId: book.id,
      title: book.title,
      categoryName: categoriesById.get(book.categoryId)?.name ?? 'Book',
      status: book.status,
      wantedType: listing.wantedType,
      tone: toneClass(listing.id),
    });
  }
  cards.sort((a, b) => (a.status === 'EXCHANGED' ? 1 : 0) - (b.status === 'EXCHANGED' ? 1 : 0));

  const ownedEligible = books.filter((b) => b.status === 'OWNED' && !listingsByBook.has(b.id));
  const purchasedEligible = payload.purchased.filter(
    (p) =>
      p.status === 'OWNED' &&
      !listingsByBook.has(p.id) &&
      !books.some((b) => b.id === p.id),
  );
  const eligible = [...ownedEligible, ...purchasedEligible];
  const pendingRequests = payload.requests.filter(
    (r) => r.status === 'PENDING' && myListingIds.has(r.listingId),
  ).length;
  const activeCount = cards.filter((c) => c.status === 'LISTED').length;
  const exchangedCount = cards.length - activeCount;

  const q = query.toLowerCase();
  const filtered = cards.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (categoryFilter !== null) {
      const book = books.find((b) => b.id === c.bookId);
      if (!book || book.categoryId !== categoryFilter) return false;
    }
    if (q && !c.title.toLowerCase().includes(q)) return false;
    return true;
  });

  const hasQuery = query !== '';
  const hasFilter = statusFilter !== 'ALL' || categoryFilter !== null;
  const noActive = cards.length > 0 && activeCount === 0;

  return (
    <div className="auth-layout">
      <AppNav />
      <main className="lib">
        <section className="lib-head" aria-labelledby="ls-heading">
          <div>
            <h1 id="ls-heading" className="bm-headline-md lib-head__title">
              My Listings
            </h1>
            <p className="bm-body-lg lib-head__copy">Books you’ve put forward for exchange.</p>
          </div>
          <div className="dash-head__actions">
            <button type="button" className="dash-cta dash-cta--primary" onClick={openPicker}>
              <PlusIcon size={15} />
              List a book
            </button>
          </div>
        </section>

        {listedNote ? (
          <section className="ls-note" role="status" aria-labelledby="ls-note-title">
            <span className="ls-note__icon" aria-hidden="true">
              <CheckIcon size={18} />
            </span>
            <p className="ls-note__text" id="ls-note-title">
              <strong>Book listed successfully</strong>
              <span>Your book is now available for exchange.</span>
            </p>
          </section>
        ) : null}

        <section className="lib-summary" aria-label="Listing summary">
          <div className="lib-stat">
            <span className="lib-stat__value">{activeCount}</span>
            <span className="lib-stat__label">Active listings</span>
          </div>
          <div className="lib-stat">
            <span className="lib-stat__value">{pendingRequests}</span>
            <span className="lib-stat__label">Pending requests</span>
          </div>
          <div className="lib-stat">
            <span className="lib-stat__value">{exchangedCount}</span>
            <span className="lib-stat__label">Exchanged</span>
          </div>
        </section>

        <form className="lib-search" role="search" onSubmit={submitSearch}>
          <span className="lib-search__icon" aria-hidden="true">
            <SearchIcon size={18} />
          </span>
          <input
            id="ls-search-input"
            className="lib-search__input"
            type="search"
            placeholder="Search my listings..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            aria-label="Search my listings"
          />
          <button
            type="submit"
            className="dash-cta dash-cta--primary dash-cta--small lib-search__button"
          >
            Search
          </button>
        </form>

        {cards.length > 0 ? (
          <div className="lib-rows">
            <div className="lib-chips" role="group" aria-label="Filter by listing status">
              <span className="lib-chips__label">Status</span>
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`lib-chip${statusFilter === filter.key ? ' lib-chip--active' : ''}`}
                  aria-pressed={statusFilter === filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="lib-chips" role="group" aria-label="Filter by category">
              <span className="lib-chips__label">Category</span>
              <button
                type="button"
                className={`lib-chip${categoryFilter === null ? ' lib-chip--active' : ''}`}
                aria-pressed={categoryFilter === null}
                onClick={() => setCategoryFilter(null)}
              >
                All
              </button>
              {payload.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`lib-chip${categoryFilter === category.id ? ' lib-chip--active' : ''}`}
                  aria-pressed={categoryFilter === category.id}
                  onClick={() => setCategoryFilter(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {cards.length > 0 ? (
          <p className="lib-meta" role="status">
            {hasQuery || hasFilter
              ? `Showing ${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'}.`
              : `${cards.length} ${cards.length === 1 ? 'listing' : 'listings'} in your catalogue.${
                  noActive ? '' : ` ${activeCount} ${activeCount === 1 ? 'is' : 'are'} active.`
                }`}
          </p>
        ) : null}

        {noActive ? (
          <section className="empty" aria-labelledby="ls-no-active-title">
            <h2 id="ls-no-active-title" className="empty__title">
              No active listings
            </h2>
            <p className="empty__copy">
              Your currently active exchange listings will appear here. Exchanged books are no
              longer available.
            </p>
          </section>
        ) : null}

        {cards.length === 0 ? (
          books.length === 0 ? (
            <section className="empty" aria-labelledby="ls-shelf-empty-title">
              <h2 id="ls-shelf-empty-title" className="empty__title">
                Your exchange shelf is empty
              </h2>
              <p className="empty__copy">
                Purchase a book from the Marketplace, then list it for exchange.
              </p>
              <Link className="dash-cta dash-cta--primary" to="/marketplace">
                Browse marketplace
              </Link>
            </section>
          ) : eligible.length > 0 ? (
            <section className="empty" aria-labelledby="ls-nothing-title">
              <h2 id="ls-nothing-title" className="empty__title">
                Nothing listed yet
              </h2>
              <p className="empty__copy">Give one of your books another reader.</p>
              <button type="button" className="dash-cta dash-cta--primary" onClick={openPicker}>
                <PlusIcon size={15} />
                List a book
              </button>
            </section>
          ) : (
            <section className="empty" aria-labelledby="ls-nothing-title">
              <h2 id="ls-nothing-title" className="empty__title">
                Nothing listed yet
              </h2>
              <p className="empty__copy">
                All of your books are already listed or exchanged. Pick up another book from the
                Marketplace when you’re ready.
              </p>
              <Link className="dash-cta dash-cta--primary" to="/marketplace">
                Browse marketplace
              </Link>
            </section>
          )
        ) : filtered.length === 0 ? (
          hasQuery ? (
            <section className="empty" aria-labelledby="ls-search-empty-title">
              <h2 id="ls-search-empty-title" className="empty__title">
                No listings found
              </h2>
              <p className="empty__copy">
                We couldn’t find any listings matching your search. Try another search.
              </p>
              <button type="button" className="dash-cta dash-cta--primary" onClick={clearSearch}>
                Clear search
              </button>
            </section>
          ) : (
            <section className="empty" aria-labelledby="ls-filter-empty-title">
              <h2 id="ls-filter-empty-title" className="empty__title">
                Nothing here yet
              </h2>
              <p className="empty__copy">There are no listings matching this filter.</p>
              <button type="button" className="dash-cta dash-cta--primary" onClick={clearFilter}>
                Clear filter
              </button>
            </section>
          )
        ) : (
          <div className="discover-grid">
            {filtered.map((card) => (
              <ListingCardView key={card.key} card={card} />
            ))}
          </div>
        )}
      </main>

      {pickerOpen ? (
        <ListBookDialog
          books={eligible}
          onClose={() => setPickerOpen(false)}
          onListed={handleListed}
        />
      ) : null}
    </div>
  );
}

function ListingCardView({ card }: { card: ListingCard }) {
  const exchanged = card.status === 'EXCHANGED';

  return (
    <article className={`book-card${exchanged ? ' book-card--exchanged' : ''}`}>
      <div className={`book-cover book-cover--${card.tone}`} aria-hidden="true">
        <span className="book-cover__initial">{initialOf(card.title)}</span>
        <span className="book-cover__tag">BookMaster</span>
      </div>
      <div className="book-card__body">
        <h3 className="book-card__title">
          <Link className="book-card__link" to={`/books/${card.bookId}`}>
            {card.title}
          </Link>
        </h3>
        <p className="book-card__meta">{card.categoryName}</p>
        <span className={`pill pill--${exchanged ? 'exchanged' : 'listed'} book-card__pill`}>
          {card.status}
        </span>
        {exchanged ? (
          <p className="ls-card-note">Exchanged — this listing is no longer active.</p>
        ) : (
          <p className="book-card__wanted">Looking for: {card.wantedType}</p>
        )}
      </div>
      <div className="book-card__foot">
        <Link className="dash-section__link" to={`/books/${card.bookId}`}>
          View book
        </Link>
      </div>
    </article>
  );
}