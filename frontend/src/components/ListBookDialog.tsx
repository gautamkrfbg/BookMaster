import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiPost } from '../api/client';
import type { BookListItem } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { CloseIcon } from './icons';
import '../pages/library.css';

interface ListBookDialogProps {
  books: BookListItem[];
  presetBookId?: number | null;
  onClose: () => void;
  onListed: () => void;
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

export function ListBookDialog({ books, presetBookId = null, onClose, onListed }: ListBookDialogProps) {
  const { session } = useAuth();
  const token = session?.token ?? null;

  const isPreset = presetBookId !== null && presetBookId !== undefined;
  const options = isPreset ? books.filter((b) => b.id === presetBookId) : books;

  const [selectedBookId, setSelectedBookId] = useState<number | null>(
    isPreset ? presetBookId : null,
  );
  const [wanted, setWanted] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const activeBookId = isPreset ? presetBookId : selectedBookId;
  const activeBook = options.find((b) => b.id === activeBookId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wantedType = wanted.trim();
    if (!token || activeBook === null || !wantedType) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost<{ id: number; bookId: number; wantedType: string }>(
        '/exchangelistings',
        { bookId: activeBook.id, wantedType },
        token,
      );
      onListed();
    } catch (caught) {
      setError(`Unable to create listing. ${friendlyError(caught)}`);
      setSaving(false);
    }
  }

  const subjectLabel = activeBook?.title ?? '';
  const submitDisabled =
    saving || activeBook === null || wanted.trim() === '' || options.length === 0;

  return (
    <div
      className="bm-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="bm-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="list-book-title"
      >
        <header className="bm-modal__head">
          <h2 id="list-book-title" className="bm-headline-sm bm-modal__title">
            List for exchange
          </h2>
          <button
            type="button"
            className="bm-modal__close"
            aria-label="Close list for exchange"
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </button>
        </header>

        <p className="bm-modal__copy">
          {isPreset
            ? `List “${subjectLabel}” in the Marketplace. Other readers can then request it and offer one of their own books in return.`
            : 'Choose a book from your library to list in the Marketplace. Only books you own that aren’t already listed or exchanged can be listed.'}
        </p>

        <form className="bm-modal__form" onSubmit={handleSubmit} noValidate>
          {isPreset ? null : options.length === 0 ? (
            <p className="ls-options__empty">
              You don’t have any books available to list. Add a book to your library from My
              Library first.
            </p>
          ) : (
            <div className="ls-options" role="radiogroup" aria-label="Books you can list">
              {options.map((book) => (
                <label
                  key={book.id}
                  className={`ls-option${
                    selectedBookId === book.id ? ' ls-option--selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="listBook"
                    value={book.id}
                    checked={selectedBookId === book.id}
                    onChange={() => setSelectedBookId(book.id)}
                    className="visually-hidden"
                  />
                  <span
                    className={`ls-option__tile book-cover--t${((book.id % 6) + 6) % 6 + 1}`}
                    aria-hidden="true"
                  >
                    {book.title.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="ls-option__text">{book.title}</span>
                </label>
              ))}
            </div>
          )}

          <div className="bm-modal__field">
            <label className="bm-modal__label" htmlFor="list-book-wanted">
              What are you looking for?
            </label>
            <input
              id="list-book-wanted"
              className="auth-input"
              type="text"
              value={wanted}
              onChange={(event) => setWanted(event.target.value)}
              maxLength={100}
              placeholder="e.g. Literary fiction"
              autoFocus={isPreset}
            />
            <p className="bm-modal__hint">
              A short description of what you’d want in trade.
            </p>
          </div>

          {error ? (
            <p className="bm-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="bm-modal__actions">
            <button
              type="submit"
              className="dash-cta dash-cta--primary"
              disabled={submitDisabled}
            >
              {saving ? 'Listing…' : 'List for exchange'}
            </button>
            <button type="button" className="dash-cta dash-cta--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}