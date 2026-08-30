import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import type { BookListItem, CategoryItem, ExchangeListingItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { ListBookDialog } from '../components/ListBookDialog';
import { ArrowRightIcon, BookIcon, SearchIcon } from '../components/icons';
import { purchasedBookIds } from '../lib/purchases';
import { toast } from '../toast/toastBus';
import './dashboard.css';
import './library.css';

interface LibraryPayload {
  books: BookListItem[];
  categories: CategoryItem[];
  listings: ExchangeListingItem[];
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'OWNED', label: 'Owned' },
  { key: 'LISTED', label: 'Listed' },
  { key: 'EXCHANGED', label: 'Exchanged' },
] as const;

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

export function LibraryPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const myId = user ? Number(user.id) : -1;

  const [payload, setPayload] = useState<LibraryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);

  const [listBook, setListBook] = useState<BookListItem | null>(null);

  const runFetch = useCallback(async (): Promise<LibraryPayload> => {
    const [books, categories, listings, purchased] = await Promise.all([
      apiGet<BookListItem[]>(`/users/${myId}/library`, token),
      apiGet<CategoryItem[]>('/categories'),
      apiGet<ExchangeListingItem[]>('/exchangelistings?pageSize=200'),
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
    const merged = [...books];
    for (const purchasedBook of purchased) {
      if (
        purchasedBook &&
        purchasedBook.ownerId === myId &&
        !merged.some((b) => b.id === purchasedBook.id)
      ) {
        merged.push(purchasedBook);
      }
    }
    return { books: merged, categories, listings };
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

  function refreshLibrary() {
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

  function openList(book: BookListItem) {
    setListBook(book);
  }

  function closeList() {
    setListBook(null);
  }

  function handleListed() {
    setListBook(null);
    refreshLibrary();
    toast.success('Book listed for exchange. You can manage it in My Listings.');
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
          <div className="skeleton" style={{ height: 40, width: 300 }} />
          <div className="skeleton" style={{ height: 16, width: 480, marginTop: 12 }} />
          <div className="lib-summary" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
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
            Loading your library
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
          <section className="empty" role="alert" aria-labelledby="lib-error-title">
            <h2 id="lib-error-title" className="empty__title">
              Unable to load your library
            </h2>
            <p className="empty__copy">Something went wrong while loading your books.</p>
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

  const countOwned = books.filter((b) => b.status === 'OWNED').length;
  const countListed = books.filter((b) => b.status === 'LISTED').length;
  const countExchanged = books.filter((b) => b.status === 'EXCHANGED').length;

  const q = query.toLowerCase();
  const viewed = books.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (categoryFilter !== null && b.categoryId !== categoryFilter) return false;
    if (q && !b.title.toLowerCase().includes(q)) return false;
    return true;
  });

  const hasQuery = query !== '';
  const hasFilter = statusFilter !== 'ALL' || categoryFilter !== null;
  const isEmptyLibrary = books.length === 0;
  const isEmptyResult = viewed.length === 0 && !isEmptyLibrary;

  return (
    <div className="auth-layout">
      <AppNav />
      <main className="lib">
        <section className="lib-head" aria-labelledby="lib-heading">
          <div>
            <h1 id="lib-heading" className="bm-headline-md lib-head__title">
              My Library
            </h1>
            <p className="bm-body-lg lib-head__copy">
              Books you own or have purchased — trade them with other readers when you&apos;re ready.
            </p>
          </div>
          <div className="dash-head__actions">
            <Link className="dash-cta dash-cta--ghost" to="/marketplace">
              Browse marketplace
            </Link>
          </div>
        </section>

        <section className="lib-summary" aria-label="Library summary">
          <div className="lib-stat">
            <span className="lib-stat__value">{books.length}</span>
            <span className="lib-stat__label">My books</span>
          </div>
          <div className="lib-stat">
            <span className="lib-stat__value">{countOwned}</span>
            <span className="lib-stat__label">Owned</span>
          </div>
          <div className="lib-stat">
            <span className="lib-stat__value">{countListed}</span>
            <span className="lib-stat__label">Listed</span>
          </div>
          <div className="lib-stat">
            <span className="lib-stat__value">{countExchanged}</span>
            <span className="lib-stat__label">Exchanged</span>
          </div>
        </section>

        <form className="lib-search" role="search" onSubmit={submitSearch}>
          <span className="lib-search__icon" aria-hidden="true">
            <SearchIcon size={18} />
          </span>
          <input
            id="lib-search-input"
            className="lib-search__input"
            type="search"
            placeholder="Search my library..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            aria-label="Search my library"
          />
          <button
            type="submit"
            className="dash-cta dash-cta--primary dash-cta--small lib-search__button"
          >
            Search
          </button>
        </form>

        <div className="lib-rows">
          <div className="lib-chips" role="group" aria-label="Filter by status">
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

        {!isEmptyLibrary ? (
          <p className="lib-meta" role="status">
            {hasQuery || hasFilter
              ? `Showing ${viewed.length} ${viewed.length === 1 ? 'book' : 'books'} in your library.`
              : `${books.length} ${books.length === 1 ? 'book' : 'books'} in your library.`}
          </p>
        ) : null}

        {isEmptyLibrary ? (
          <section className="empty" aria-labelledby="lib-empty-title">
            <h2 id="lib-empty-title" className="empty__title">
              Your library is waiting for its first book.
            </h2>
            <p className="empty__copy">
              Browse the Marketplace to pick up a book, or trade books with other readers through
              exchanges.
            </p>
            <Link className="dash-cta dash-cta--primary" to="/marketplace">
              Browse marketplace
            </Link>
          </section>
        ) : isEmptyResult ? (
          hasQuery ? (
            <section className="empty" aria-labelledby="lib-search-empty-title">
              <h2 id="lib-search-empty-title" className="empty__title">
                No books found
              </h2>
              <p className="empty__copy">
                We couldn&apos;t find any books matching your search. Try another search.
              </p>
              <button type="button" className="dash-cta dash-cta--primary" onClick={clearSearch}>
                Clear search
              </button>
            </section>
          ) : (
            <section className="empty" aria-labelledby="lib-filter-empty-title">
              <h2 id="lib-filter-empty-title" className="empty__title">
                Nothing here yet
              </h2>
              <p className="empty__copy">There are no books matching this filter.</p>
              <button type="button" className="dash-cta dash-cta--primary" onClick={clearFilter}>
                Clear filter
              </button>
            </section>
          )
        ) : (
          <div className="discover-grid">
            {viewed.map((book) => (
              <LibraryCard
                key={book.id}
                book={book}
                purchased={purchasedBookIds(myId).includes(book.id)}
                categoryName={categoriesById.get(book.categoryId)?.name ?? 'Book'}
                wantedType={listingsByBook.get(book.id)?.wantedType ?? null}
                onList={() => openList(book)}
              />
            ))}
          </div>
        )}
      </main>

      {listBook ? (
        <ListBookDialog
          books={[listBook]}
          presetBookId={listBook.id}
          onClose={closeList}
          onListed={handleListed}
        />
      ) : null}
    </div>
  );
}

function LibraryCard({
  book,
  purchased,
  categoryName,
  wantedType,
  onList,
}: {
  book: BookListItem;
  purchased: boolean;
  categoryName: string;
  wantedType: string | null;
  onList: () => void;
}) {
  const statusTone =
    book.status === 'LISTED' ? 'listed' : book.status === 'EXCHANGED' ? 'exchanged' : 'owned';

  return (
    <article
      className={`book-card${!purchased && book.status === 'EXCHANGED' ? ' book-card--exchanged' : ''}`}
    >
      <div className={`book-cover book-cover--${toneClass(book.id)}`} aria-hidden="true">
        <span className="book-cover__initial">{initialOf(book.title)}</span>
        <span className="book-cover__tag">BookMaster</span>
      </div>
      <div className="book-card__body">
        <h3 className="book-card__title">
          <Link className="book-card__link" to={`/books/${book.id}`}>
            {book.title}
          </Link>
        </h3>
        <p className="book-card__meta">
          {book.author.trim().length > 0 ? `${book.author} · ` : ''}
          {categoryName}
        </p>
        {purchased ? (
          <span className="pill pill--purchased book-card__pill">Purchased</span>
        ) : (
          <span className={`pill pill--${statusTone} book-card__pill`}>{book.status}</span>
        )}
        {!purchased && book.status === 'LISTED' && wantedType ? (
          <p className="book-card__wanted">Looking for: {wantedType}</p>
        ) : null}
      </div>
      <div className="book-card__foot">
        {purchased ? (
          <div className="book-card__actions">
            <Link className="dash-cta dash-cta--ghost dash-cta--small" to={`/books/read/${book.id}`}>
              <BookIcon size={13} />
              Read
            </Link>
            {wantedType === null && book.status !== 'EXCHANGED' ? (
              <button
                type="button"
                className="dash-cta dash-cta--ghost dash-cta--small"
                onClick={onList}
              >
                List for exchange
              </button>
            ) : null}
            <Link className="dash-section__link" to={`/books/${book.id}`}>
              View book <ArrowRightIcon size={13} />
            </Link>
          </div>
        ) : (
          <div className="book-card__actions">
            <Link className="dash-cta dash-cta--ghost dash-cta--small" to={`/books/read/${book.id}`}>
              <BookIcon size={13} />
              Read
            </Link>
            {book.status === 'OWNED' ? (
              <button type="button" className="dash-cta dash-cta--ghost dash-cta--small" onClick={onList}>
                List for exchange
              </button>
            ) : (
              <Link className="dash-section__link" to={`/books/${book.id}`}>
                View book <ArrowRightIcon size={13} />
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}