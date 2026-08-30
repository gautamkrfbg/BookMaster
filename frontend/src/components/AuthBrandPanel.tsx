import type { ReactNode } from 'react';
import booksImg from '../assets/brand/books.jpg';
import { Wordmark } from './Wordmark';

interface AuthBrandPanelProps {
  /** Headline shown under the wordmark, e.g. "Exchange stories.\nDiscover new ones." */
  headline: ReactNode;
  supporting?: string;
  showQuote?: boolean;
}

export function AuthBrandPanel({
  headline,
  supporting,
  showQuote = false,
}: AuthBrandPanelProps) {
  return (
    <div className="auth-brand__inner">
      <span className="auth-brand__blob" aria-hidden="true" />
      <Wordmark />
      <h2 className="bm-display-lg auth-brand__headline">{headline}</h2>
      {supporting ? (
        <p className="bm-body-lg auth-brand__supporting">{supporting}</p>
      ) : null}
      <div className="auth-brand__media">
        <img src={booksImg} alt="A stack of cloth-bound books" />
      </div>
      {showQuote ? (
        <blockquote className="auth-brand__quote">
          Every book deserves another reader.
        </blockquote>
      ) : null}
    </div>
  );
}