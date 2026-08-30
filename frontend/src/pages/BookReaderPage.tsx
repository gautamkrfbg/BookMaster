import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { apiGet } from '../api/client';
import type { BookListItem, CategoryItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { ArrowLeftIcon, ArrowRightIcon, BookIcon } from '../components/icons';
import { hasPurchased } from '../lib/purchases';
import { resolveReaderContent } from '../lib/readerContent';
import type { ReaderChapter } from '../lib/readerContent';
import './dashboard.css';
import './reader.css';

interface ReaderPayload {
  book: BookListItem;
  categoryName: string;
}

interface PageEntry {
  chapterTitle: string;
  text: string;
}

export function BookReaderPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const user = session?.user ?? null;
  const myId = user ? Number(user.id) : -1;
  const activeId = id ?? '';

  const [payload, setPayload] = useState<ReaderPayload | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const chapters: ReaderChapter[] = resolveReaderContent(activeId || 'demo');
  const pageEntries: PageEntry[] = chapters.flatMap((chapter) =>
    chapter.pages.map((text) => ({ chapterTitle: chapter.title, text })),
  );
  const pageCount = pageEntries.length;

  const runFetch = useCallback(async (): Promise<ReaderPayload> => {
    const [book, categories] = await Promise.all([
      apiGet<BookListItem>(`/books/${id}`),
      apiGet<CategoryItem[]>('/categories'),
    ]);
    const categoryName = categories.find((c) => c.id === book.categoryId)?.name ?? 'Book';
    return { book, categoryName };
  }, [id]);

  useEffect(() => {
    let active = true;
    runFetch().then(
      (result) => {
        if (!active) return;
        setPayload(result);
        setLoadedId(activeId);
        setPageIndex(0);
      },
      (error: unknown) => {
        if (!active) return;
        if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 404) {
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

  useEffect(() => {
    if (!payload) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        setPageIndex((current) => Math.max(0, current - 1));
      } else if (event.key === 'ArrowRight') {
        setPageIndex((current) => Math.min(pageCount - 1, current + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [payload, pageCount]);

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  const loading = loadedId !== activeId;

  if (loading) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="rdr">
          <div className="skeleton rdr-head-skel" style={{ height: 24, width: 220, display: 'block' }} />
          <div className="skeleton" style={{ height: 14, width: 140, marginTop: 10, display: 'block' }} />
          <div className="skeleton" style={{ height: 14, width: '62%', marginTop: 26, display: 'block' }} />
          <div className="skeleton" style={{ height: 14, width: '80%', marginTop: 10, display: 'block' }} />
          <div className="skeleton" style={{ height: 14, width: '46%', marginTop: 10, display: 'block' }} />
          <p className="visually-hidden" role="status">
            Loading reading preview
          </p>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="rdr">
          <section className="empty" role="alert" aria-labelledby="rdr-404-title">
            <h2 id="rdr-404-title" className="empty__title">
              Book not found
            </h2>
            <p className="empty__copy">This book may have been removed or is no longer available.</p>
            <Link className="dash-cta dash-cta--primary" to="/marketplace">
              <ArrowLeftIcon size={15} />
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
        <main className="rdr">
          <section className="empty" role="alert" aria-labelledby="rdr-error-title">
            <h2 id="rdr-error-title" className="empty__title">
              Unable to load book
            </h2>
            <p className="empty__copy">Something went wrong while loading this book.</p>
            <button
              type="button"
              className="dash-cta dash-cta--primary"
              onClick={() => {
                setFailed(false);
                setLoadedId('');
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  const { book } = payload;
  const readable = book.ownerId === myId || hasPurchased(myId, book.id);

  if (!readable) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main className="rdr">
          <Link className="rdr-back" to={`/books/${book.id}`}>
            <ArrowLeftIcon size={15} />
            <span>Back to book details</span>
          </Link>
          <section className="empty" role="alert" aria-labelledby="rdr-denied-title">
            <span className="rdr-denied__icon" aria-hidden="true">
              <BookIcon size={24} />
            </span>
            <h2 id="rdr-denied-title" className="empty__title">
              Reading preview is not available
            </h2>
            <p className="empty__copy">
              This demo reading preview is available only for books you own or received through
              an exchange, and for books you mock-purchase. You don&rsquo;t have access to
              &ldquo;{book.title}&rdquo; yet.
            </p>
            <div className="dash-actions rdr-denied__actions">
              <Link className="dash-cta dash-cta--primary" to={`/books/${book.id}`}>
                View book details
              </Link>
              <Link className="dash-cta dash-cta--ghost" to="/marketplace">
                Browse Marketplace
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const current = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const currentPage = pageEntries[current];

  const jumpToChapter = (chapterIndex: number): number =>
    chapters
      .slice(0, chapterIndex)
      .reduce((total, chapter) => total + chapter.pages.length, 0);

  const authorLabel = book.author.trim().length > 0 ? book.author : 'Unknown author';

  return (
    <div className="auth-layout">
      <AppNav />
      <main className="rdr">
        <header className="rdr-topbar">
          <div className="rdr-topbar__links">
            <Link className="rdr-back" to={`/books/${book.id}`}>
              <ArrowLeftIcon size={15} />
              <span>Book details</span>
            </Link>
            <Link className="rdr-back" to="/library">
              <ArrowLeftIcon size={15} />
              <span>My Library</span>
            </Link>
          </div>
          <span className="pill pill--listed">Demo reading preview</span>
        </header>

        <section className="rdr-heading" aria-labelledby="rdr-title">
          <h1 id="rdr-title" className="rdr-title">
            {book.title}
          </h1>
          <p className="rdr-author">{authorLabel}</p>
          <p className="rdr-category">{payload.categoryName}</p>
        </section>

        <div className="rdr-layout">
          <nav className="rdr-toc" aria-label="Table of contents">
            <h2 className="rdr-toc__title">Contents</h2>
            <ol className="rdr-toc__list">
              {chapters.map((chapter, chapterIndex) => {
                const target = jumpToChapter(chapterIndex);
                const active =
                  current >= target && current < target + chapter.pages.length;
                return (
                  <li key={chapter.title}>
                    <button
                      type="button"
                      className={`rdr-toc__item${active ? ' rdr-toc__item--active' : ''}`}
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setPageIndex(target)}
                    >
                      {chapter.title}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <article className="rdr-page" aria-labelledby="rdr-page-title">
            <h2 id="rdr-page-title" className="rdr-page__chapter">
              {currentPage.chapterTitle}
            </h2>
            <p className="rdr-page__text">{currentPage.text}</p>
            <p className="rdr-note" role="note">
              Sample text shown for demonstration. This is not the actual content of the book.
            </p>
            <div className="rdr-pager">
              <button
                type="button"
                className="dash-cta dash-cta--ghost"
                disabled={current === 0}
                onClick={() => setPageIndex(Math.max(0, current - 1))}
              >
                <ArrowLeftIcon size={15} />
                Previous
              </button>
              <span className="rdr-pager__indicator" role="status">
                Page {current + 1} of {pageCount}
              </span>
              <button
                type="button"
                className="dash-cta dash-cta--primary"
                disabled={current >= pageCount - 1}
                onClick={() => setPageIndex(Math.min(pageCount - 1, current + 1))}
              >
                Next
                <ArrowRightIcon size={15} />
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}