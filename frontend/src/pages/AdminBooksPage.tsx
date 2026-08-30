import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiError, apiDelete, apiGet, apiPostForm } from '../api/client';
import type { BookListItem, CategoryItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { ArrowLeftIcon, CloseIcon, InfoIcon, PlusIcon } from '../components/icons';
import { formatINR } from '../lib/price';
import { toast } from '../toast/toastBus';
import './admin.css';
import './dashboard.css';
import './library.css';

interface AdminBooksPayload {
  books: BookListItem[];
  categories: CategoryItem[];
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

export function AdminBooksPage() {
  const { session } = useAuth();
  const user = session?.user;
  const token = session?.token ?? null;
  const isAdmin = user?.role === 'ADMIN';

  const [payload, setPayload] = useState<AdminBooksPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [denied, setDenied] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addAuthor, setAddAuthor] = useState('');
  const [addCategoryId, setAddCategoryId] = useState<number | null>(null);
  const [addPrice, setAddPrice] = useState('');
  const [addPdf, setAddPdf] = useState<File | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [pdfUploadingId, setPdfUploadingId] = useState<number | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfTargetId, setPdfTargetId] = useState<number | null>(null);

  const runFetch = useCallback(async (): Promise<AdminBooksPayload> => {
    const [books, categories] = await Promise.all([
      apiGet<BookListItem[]>('/books?pageSize=200'),
      apiGet<CategoryItem[]>('/categories'),
    ]);
    return { books, categories };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    runFetch()
      .then((result) => {
        if (!active) return;
        setPayload(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 403) {
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

  useEffect(() => {
    if (!addOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAdd();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [addOpen]);

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
            aria-labelledby="abm-denied-title"
            role="alert"
          >
            <span className="adm-denied__icon" aria-hidden="true">
              <InfoIcon size={22} />
            </span>
            <h1 id="abm-denied-title" className="bm-headline-md">
              Access restricted
            </h1>
            <p className="adm-denied__copy">
              You don&rsquo;t have permission to manage books.
            </p>
            <Link to="/dashboard" className="dash-cta dash-cta--primary">
              Return to Dashboard
              <ArrowLeftIcon size={16} />
            </Link>
          </section>
        </main>
      </div>
    );
  }

  function closeAdd() {
    setAddOpen(false);
    setAddError(null);
  }

  function openAdd() {
    setAddTitle('');
    setAddAuthor('');
    setAddCategoryId(null);
    setAddPrice('');
    setAddPdf(null);
    setAddError(null);
    setAddOpen(true);
  }

  async function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = addTitle.trim();
    const author = addAuthor.trim();
    const price = Number(addPrice);
    if (!token || !title || !author || addCategoryId === null || !Number.isFinite(price) || price <= 0) {
      return;
    }
    if (addPdf && addPdf.type !== 'application/pdf') {
      setAddError('The reading file must be a PDF.');
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const form = new FormData();
      form.set('title', title);
      form.set('author', author);
      form.set('categoryId', String(addCategoryId));
      form.set('price', String(price));
      if (addPdf) form.set('pdf', addPdf);

      await apiPostForm<BookListItem>('/admin/books', form, token);
      setAddOpen(false);
      toast.success('Book added to the catalog.');
      refresh();
    } catch (error) {
      setAddError(`Unable to add the book. ${friendlyError(error)}`);
    } finally {
      setAddSaving(false);
    }
  }

  function refresh() {
    runFetch().then(
      (result) => {
        setPayload(result);
        setFailed(false);
      },
      () => setFailed(true),
    );
  }

  function openPdfPicker(book: BookListItem) {
    setPdfTargetId(book.id);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
    pdfInputRef.current?.click();
  }

  async function handlePdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const bookId = pdfTargetId;
    setPdfTargetId(null);
    if (!file || bookId === null || !token) return;

    if (file.type !== 'application/pdf') {
      toast.error('The reading file must be a PDF.');
      return;
    }

    setPdfUploadingId(bookId);
    try {
      const form = new FormData();
      form.set('pdf', file);
      await apiPostForm<BookListItem>(`/admin/books/${bookId}/pdf`, form, token);
      toast.success('PDF attached. Readers can now open it in the reader.');
      refresh();
    } catch (error) {
      toast.error(`Unable to upload the PDF. ${friendlyError(error)}`);
    } finally {
      setPdfUploadingId(null);
    }
  }

  async function removeBook(book: BookListItem) {
    if (!token) return;
    setRemovingId(book.id);
    try {
      await apiDelete(`/books/${book.id}`, token);
      setConfirmingId(null);
      toast.success(`“${book.title}” removed from the catalog.`);
      refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(
          `“${book.title}” is referenced by exchange activity and cannot be removed.`,
        );
      } else {
        toast.error(`Unable to remove “${book.title}”. ${friendlyError(error)}`);
      }
    } finally {
      setRemovingId(null);
      setConfirmingId(null);
    }
  }

  function handleRetry() {
    setLoading(true);
    setFailed(false);
    runFetch()
      .then((result) => {
        setPayload(result);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main id="main" className="adm">
          <div className="skeleton" style={{ height: 36, width: 260, display: 'block' }} />
          <div className="skeleton" style={{ height: 16, width: 380, marginTop: 12, display: 'block' }} />
          <div className="adm-loading" style={{ marginTop: 28 }} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton adm-loading__card" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (failed || !payload) {
    return (
      <div className="auth-layout">
        <AppNav />
        <main id="main" className="adm">
          <section className="empty" role="alert" aria-labelledby="abm-error-title">
            <h2 id="abm-error-title" className="empty__title">
              Unable to load books
            </h2>
            <p className="empty__copy">Something went wrong while loading the catalog.</p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={handleRetry}>
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  const { books, categories } = payload;
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="auth-layout">
      <AppNav />
      <main id="main" className="adm">
        <Link className="abm-back" to="/admin">
          <ArrowLeftIcon size={15} />
          <span>Back to Admin Dashboard</span>
        </Link>

        <section className="lib-head">
          <div>
            <h1 className="bm-headline-md">Book catalog</h1>
            <p className="lib-head__copy">
              Add new books or remove existing ones from the catalog. Removing a book that
              is referenced by exchange activity is blocked.
            </p>
          </div>
          <div className="dash-head__actions">
            <button type="button" className="dash-cta dash-cta--primary" onClick={openAdd}>
              <PlusIcon size={15} />
              Add a book
            </button>
          </div>
        </section>

        <p className="lib-meta" role="status">
          {books.length} {books.length === 1 ? 'book' : 'books'} in the catalog.
        </p>

        {books.length === 0 ? (
          <section className="empty" aria-labelledby="abm-empty-title">
            <h2 id="abm-empty-title" className="empty__title">
              The catalog is empty
            </h2>
            <p className="empty__copy">
              Add a book to the catalog to make it available to readers.
            </p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={openAdd}>
              <PlusIcon size={15} />
              Add a book
            </button>
          </section>
        ) : (
          <div className="abm-table" role="table" aria-label="Books in the catalog">
            <div className="abm-table__row abm-table__row--head" role="row">
              <span role="columnheader">Title</span>
              <span role="columnheader">Author</span>
              <span role="columnheader">Category</span>
              <span role="columnheader">Price</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Owner</span>
              <span role="columnheader">PDF</span>
              <span className="abm-table__actions" role="columnheader">
                Actions
              </span>
            </div>
            {books.map((book) => (
              <div className="abm-table__row" role="row" key={book.id}>
                <span role="cell">
                  <Link className="abm-table__title" to={`/books/${book.id}`}>
                    {book.title}
                  </Link>
                </span>
                <span role="cell">
                  {book.author.trim().length > 0 ? book.author : 'Unknown author'}
                </span>
                <span role="cell">{categoriesById.get(book.categoryId)?.name ?? 'Book'}</span>
                <span role="cell">{book.price > 0 ? formatINR(book.price) : '—'}</span>
                <span role="cell">
                  <span className={`pill pill--${book.status === 'LISTED' ? 'listed' : book.status === 'EXCHANGED' ? 'exchanged' : 'owned'}`}>
                    {book.status}
                  </span>
                </span>
                <span role="cell">
                  {book.isCatalogue ? 'Catalogue' : `#${book.ownerId}`}
                </span>
                <span role="cell">
                  <button
                    type="button"
                    className="dash-cta dash-cta--ghost dash-cta--small abm-remove"
                    disabled={pdfUploadingId === book.id}
                    onClick={() => openPdfPicker(book)}
                  >
                    {pdfUploadingId === book.id
                      ? 'Uploading…'
                      : book.pdfUrl
                        ? 'Replace PDF'
                        : 'Attach PDF'}
                  </button>
                </span>
                <span className="abm-table__actions" role="cell">
                  {confirmingId === book.id ? (
                    <button
                      type="button"
                      className="dash-cta dash-cta--primary dash-cta--small abm-remove"
                      disabled={removingId === book.id}
                      onClick={() => removeBook(book)}
                    >
                      {removingId === book.id ? 'Removing…' : 'Confirm remove'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="dash-cta dash-cta--ghost dash-cta--small abm-remove"
                      onClick={() => setConfirmingId(book.id)}
                    >
                      Remove
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="visually-hidden"
          onChange={handlePdfSelected}
        />

        <p className="abm-note" role="note">
          Book management writes are real catalog changes. Mock purchase and reading features
          live in the frontend only.
        </p>
      </main>

      {addOpen ? (
        <div
          className="bm-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAdd();
          }}
        >
          <section
            className="bm-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="abm-add-title"
          >
            <header className="bm-modal__head">
              <h2 id="abm-add-title" className="bm-headline-sm bm-modal__title">
                Add a book
              </h2>
              <button
                type="button"
                className="bm-modal__close"
                aria-label="Close add book"
                onClick={closeAdd}
              >
                <CloseIcon size={16} />
              </button>
            </header>
<p className="bm-modal__copy">
                Add a book to the catalog. It appears in the Marketplace immediately.
              </p>
            <form className="bm-modal__form" onSubmit={submitAdd} noValidate>
              <div className="bm-modal__field">
                <label className="bm-modal__label" htmlFor="abm-add-title-input">
                  Title
                </label>
                <input
                  id="abm-add-title-input"
                  className="auth-input"
                  type="text"
                  value={addTitle}
                  onChange={(event) => setAddTitle(event.target.value)}
                  maxLength={255}
                  placeholder="Enter the book title"
                  autoFocus
                />
              </div>
              <div className="bm-modal__field">
                <label className="bm-modal__label" htmlFor="abm-add-author-input">
                  Author
                </label>
                <input
                  id="abm-add-author-input"
                  className="auth-input"
                  type="text"
                  value={addAuthor}
                  onChange={(event) => setAddAuthor(event.target.value)}
                  maxLength={255}
                  placeholder="Enter the author's name"
                />
              </div>
              <div className="bm-modal__field">
                <label className="bm-modal__label" htmlFor="abm-add-category">
                  Category
                </label>
                <select
                  id="abm-add-category"
                  className="auth-select"
                  value={addCategoryId ?? ''}
                  onChange={(event) =>
                    setAddCategoryId(event.target.value === '' ? null : Number(event.target.value))
                  }
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bm-modal__field">
                <label className="bm-modal__label" htmlFor="abm-add-price">
                  Cost (₹)
                </label>
                <input
                  id="abm-add-price"
                  className="auth-input"
                  type="number"
                  min={1}
                  step={1}
                  value={addPrice}
                  onChange={(event) => setAddPrice(event.target.value)}
                  placeholder="Enter the selling price in INR"
                />
              </div>
              <div className="bm-modal__field">
                <label className="bm-modal__label" htmlFor="abm-add-pdf">
                  Book PDF (optional)
                </label>
                <input
                  id="abm-add-pdf"
                  className="auth-input"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setAddPdf(event.target.files?.[0] ?? null)}
                />
                <p className="bm-modal__hint">
                  Upload the book as a PDF to let readers open it in the built-in reader.
                  You can add or replace this later from the book&rsquo;s details.
                </p>
              </div>

              {addError ? (
                <p className="bm-modal__error" role="alert">
                  {addError}
                </p>
              ) : null}

              <div className="bm-modal__actions">
                <button
                  type="submit"
                  className="dash-cta dash-cta--primary"
                  disabled={
                    addSaving ||
                    addTitle.trim() === '' ||
                    addAuthor.trim() === '' ||
                    addCategoryId === null ||
                    !(Number.isFinite(Number(addPrice)) && Number(addPrice) > 0)
                  }
                >
                  {addSaving ? 'Adding…' : 'Add book'}
                </button>
                <button
                  type="button"
                  className="dash-cta dash-cta--ghost"
                  onClick={closeAdd}
                  disabled={addSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}