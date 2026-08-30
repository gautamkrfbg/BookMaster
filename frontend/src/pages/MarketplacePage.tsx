import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import type {
  BookListItem,
  CategoryItem,
  ExchangeListingItem,
  UserListItem,
} from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { SearchIcon } from '../components/icons';
import { formatINR } from '../lib/price';
import { hasPurchased } from '../lib/purchases';
import './dashboard.css';
import './marketplace.css';

interface MarketplacePayload {
  books: BookListItem[];
  categories: CategoryItem[];
  listings: ExchangeListingItem[];
  users: UserListItem[];
}

interface MarketplaceItem {
  key: number;
  bookId: number;
  kind: 'purchase' | 'exchange';
  title: string;
  author: string;
  categoryName: string;
  ownerName: string;
  wantedType: string;
  price: number;
  tone: string;
}

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

function toneClass(id: number): string {
  return `t${((id % 6) + 6) % 6 + 1}`;
}

function booksPath(query: string, categoryId: number | null): string {
  const params = new URLSearchParams({ pageSize: '200' });
  if (query) params.set('search', query);
  if (categoryId !== null) params.set('categoryId', String(categoryId));
  return `/books?${params.toString()}`;
}

export function MarketplacePage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const myId = user ? Number(user.id) : -1;

  const [payload, setPayload] = useState<MarketplacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const runFetch = useCallback(async (): Promise<MarketplacePayload> => {
    const [books, categories, listings, users] = await Promise.all([
      apiGet<BookListItem[]>(booksPath(query, categoryId)),
      apiGet<CategoryItem[]>('/categories'),
      apiGet<ExchangeListingItem[]>('/exchangelistings?pageSize=200'),
      apiGet<UserListItem[]>('/users'),
    ]);
    return { books, categories, listings, users };
  }, [query, categoryId]);

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

  const items = useMemo<MarketplaceItem[]>(() => {
    if (!payload) return [];
    const booksById = new Map(payload.books.map((b) => [b.id, b]));
    const categoriesById = new Map(payload.categories.map((c) => [c.id, c]));
    const usersById = new Map(payload.users.map((u) => [u.id, u]));
    const out: MarketplaceItem[] = [];
    const seen = new Set<number>();
    for (const listing of payload.listings) {
      if (seen.has(listing.bookId)) continue;
      const book = booksById.get(listing.bookId);
      if (!book || book.ownerId === myId) continue;
      seen.add(listing.bookId);
      out.push({
        key: listing.id,
        bookId: book.id,
        kind: 'exchange',
        title: book.title,
        author: book.author,
        categoryName: categoriesById.get(book.categoryId)?.name ?? 'Book',
        ownerName: usersById.get(book.ownerId)?.name ?? 'A reader',
        wantedType: listing.wantedType,
        price: book.price,
        tone: toneClass(listing.id),
      });
    }
    for (const book of payload.books) {
      if (seen.has(book.id)) continue;
      if (!book.isCatalogue) continue;
      if (book.ownerId === myId) continue;
      if (hasPurchased(myId, book.id)) continue;
      seen.add(book.id);
      out.push({
        key: book.id,
        bookId: book.id,
        kind: 'purchase',
        title: book.title,
        author: book.author,
        categoryName: categoriesById.get(book.categoryId)?.name ?? 'Book',
        ownerName: usersById.get(book.ownerId)?.name ?? 'BookMaster',
        wantedType: '',
        price: book.price,
        tone: toneClass(book.id),
      });
    }
    return out;
  }, [payload, myId]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  function clearFilters() {
    setDraft('');
    setQuery('');
    setCategoryId(null);
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

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="mkt">
          <div className="skeleton" style={{ height: 40, width: 360 }} />
          <div className="skeleton" style={{ height: 18, width: 460, marginTop: 12 }} />
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
            Loading books
          </p>
        </main>
      </div>
    );
  }

  if (failed || !payload) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="mkt">
          <section className="empty" role="alert" aria-labelledby="mkt-error-title">
            <h2 id="mkt-error-title" className="empty__title">
              Unable to load books
            </h2>
            <p className="empty__copy">Something went wrong while loading the marketplace.</p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={retry}>
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  const activeFilters = query !== '' || categoryId !== null;
  const noun = items.length === 1 ? 'book' : 'books';
  const meta = activeFilters
    ? `Showing ${items.length} ${noun} found for your search.`
    : `${items.length} ${noun} available in the Marketplace — buy new copies or swap through exchanges.`;

  return (
    <div className="auth-layout">
      <AppNav />
      <main className="mkt">
        <section className="mkt-head" aria-labelledby="mkt-heading">
          <h1 id="mkt-heading" className="bm-headline-md mkt-head__title">
            Discover your next book
          </h1>
          <p className="bm-body-lg mkt-head__copy">
            Discover books to buy, or swap titles with other readers through exchanges.
          </p>
        </section>

        <form className="mkt-search" role="search" onSubmit={submitSearch}>
          <span className="mkt-search__icon" aria-hidden="true">
            <SearchIcon size={18} />
          </span>
          <input
            id="mkt-search-input"
            className="mkt-search__input"
            type="search"
            placeholder="Search books..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            aria-label="Search books"
          />
          <button type="submit" className="dash-cta dash-cta--primary mkt-search__button">
            Search
          </button>
        </form>

        <div className="mkt-filters" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`mkt-chip${categoryId === null ? ' mkt-chip--active' : ''}`}
            aria-pressed={categoryId === null}
            onClick={() => setCategoryId(null)}
          >
            All books
          </button>
          {payload.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`mkt-chip${categoryId === category.id ? ' mkt-chip--active' : ''}`}
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <p className="mkt-meta" role="status">
          {meta}
        </p>

        {items.length === 0 ? (
          activeFilters ? (
            <section className="empty" aria-labelledby="mkt-empty-title">
              <h2 id="mkt-empty-title" className="empty__title">
                {query ? `No books found for "${query}"` : 'No books found'}
              </h2>
              <p className="empty__copy">Try a different search or browse all available books.</p>
              <div className="dash-actions">
                <button type="button" className="dash-cta dash-cta--primary" onClick={clearFilters}>
                  Clear search
                </button>
                <button type="button" className="dash-cta dash-cta--ghost" onClick={clearFilters}>
                  Browse all books
                </button>
              </div>
            </section>
          ) : (
            <section className="empty" aria-labelledby="mkt-empty-title">
              <h2 id="mkt-empty-title" className="empty__title">
                Nothing in the Marketplace yet
              </h2>
              <p className="empty__copy">
                There aren&apos;t any books available right now. Check back soon.
              </p>
              <Link className="dash-cta dash-cta--primary" to="/library">
                Explore my library
              </Link>
            </section>
          )
        ) : (
          <div className="discover-grid">
            {items.map((item) => (
              <BookCard key={item.key} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BookCard({ item }: { item: MarketplaceItem }) {
  return (
    <article className="book-card">
      <div className={`book-cover book-cover--${item.tone}`} aria-hidden="true">
        <span className="book-cover__initial">{initialOf(item.title)}</span>
        <span className="book-cover__tag">BookMaster</span>
      </div>
      <div className="book-card__body">
        <h3 className="book-card__title">{item.title}</h3>
        <p className="book-card__meta">
          {item.kind === 'purchase' && item.author.trim().length > 0
            ? `${item.author} · ${item.categoryName}`
            : item.categoryName}
        </p>
        {item.kind === 'purchase' ? (
          <span className="pill pill--purchase book-card__pill">
            Buy for {formatINR(item.price)}
          </span>
        ) : (
          <span className="pill pill--listed book-card__pill">LISTED</span>
        )}
        {item.kind === 'exchange' ? (
          <>
            <p className="book-card__wanted">Looking for: {item.wantedType}</p>
            <p className="book-card__owner">Listed by {item.ownerName}</p>
          </>
        ) : (
          <p className="book-card__owner">Sold by {item.ownerName}</p>
        )}
      </div>
      <div className="book-card__foot">
        <Link className="dash-section__link" to={`/books/${item.bookId}`}>
          View book
        </Link>
      </div>
    </article>
  );
}