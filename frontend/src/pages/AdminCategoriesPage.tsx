import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../api/client';
import type { CategoryItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppNav } from '../components/AppNav';
import { ArrowLeftIcon, CloseIcon, InfoIcon, PlusIcon } from '../components/icons';
import { toast } from '../toast/toastBus';
import './admin.css';
import './dashboard.css';
import './library.css';

interface AdminCategoriesPayload {
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

export function AdminCategoriesPage() {
  const { session } = useAuth();
  const user = session?.user;
  const token = session?.token ?? null;
  const isAdmin = user?.role === 'ADMIN';

  const [payload, setPayload] = useState<AdminCategoriesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [denied, setDenied] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const runFetch = useCallback(async (): Promise<AdminCategoriesPayload> => {
    const categories = await apiGet<CategoryItem[]>('/categories');
    return { categories };
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
            aria-labelledby="acm-denied-title"
            role="alert"
          >
            <span className="adm-denied__icon" aria-hidden="true">
              <InfoIcon size={22} />
            </span>
            <h1 id="acm-denied-title" className="bm-headline-md">
              Access restricted
            </h1>
            <p className="adm-denied__copy">
              You don&rsquo;t have permission to manage categories.
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
    setAddName('');
    setAddError(null);
    setAddOpen(true);
  }

  async function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = addName.trim();
    if (!token || !name) return;
    setAddSaving(true);
    setAddError(null);
    try {
      await apiPost<CategoryItem>('/categories', { name }, token);
      setAddOpen(false);
      toast.success('Category added.');
      refresh();
    } catch (error) {
      setAddError(`Unable to add the category. ${friendlyError(error)}`);
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
          <section className="empty" role="alert" aria-labelledby="acm-error-title">
            <h2 id="acm-error-title" className="empty__title">
              Unable to load categories
            </h2>
            <p className="empty__copy">Something went wrong while loading the categories.</p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={handleRetry}>
              Try again
            </button>
          </section>
        </main>
      </div>
    );
  }

  const { categories } = payload;

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
            <h1 className="bm-headline-md">Categories</h1>
            <p className="lib-head__copy">
              View the categories used across the Marketplace and add new ones for admin-created
              books.
            </p>
          </div>
          <div className="dash-head__actions">
            <button type="button" className="dash-cta dash-cta--primary" onClick={openAdd}>
              <PlusIcon size={15} />
              Add a category
            </button>
          </div>
        </section>

        <p className="lib-meta" role="status">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}.
        </p>

        {categories.length === 0 ? (
          <section className="empty" aria-labelledby="acm-empty-title">
            <h2 id="acm-empty-title" className="empty__title">
              No categories yet
            </h2>
            <p className="empty__copy">
              Add a category so books can be grouped in the Marketplace.
            </p>
            <button type="button" className="dash-cta dash-cta--primary" onClick={openAdd}>
              <PlusIcon size={15} />
              Add a category
            </button>
          </section>
        ) : (
          <div className="abm-table" role="table" aria-label="Book categories">
            <div className="abm-table__row abm-table__row--head" role="row">
              <span role="columnheader">ID</span>
              <span role="columnheader">Name</span>
            </div>
            {categories.map((category) => (
              <div className="abm-table__row" role="row" key={category.id}>
                <span role="cell">#{category.id}</span>
                <span role="cell">{category.name}</span>
              </div>
            ))}
          </div>
        )}

        <p className="abm-note" role="note">
          Categories can only be removed when no books use them.
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
            aria-labelledby="acm-add-title"
          >
            <header className="bm-modal__head">
              <h2 id="acm-add-title" className="bm-headline-sm bm-modal__title">
                Add a category
              </h2>
              <button
                type="button"
                className="bm-modal__close"
                aria-label="Close add category"
                onClick={closeAdd}
              >
                <CloseIcon size={16} />
              </button>
            </header>
            <p className="bm-modal__copy">
              Add a category to use when adding books to the catalog.
            </p>
            <form className="bm-modal__form" onSubmit={submitAdd} noValidate>
              <div className="bm-modal__field">
                <label className="bm-modal__label" htmlFor="acm-add-name-input">
                  Name
                </label>
                <input
                  id="acm-add-name-input"
                  className="auth-input"
                  type="text"
                  value={addName}
                  onChange={(event) => setAddName(event.target.value)}
                  maxLength={255}
                  placeholder="Enter the category name"
                  autoFocus
                />
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
                  disabled={addSaving || addName.trim() === ''}
                >
                  {addSaving ? 'Adding…' : 'Add category'}
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