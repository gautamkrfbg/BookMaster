import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import type { ReactNode } from 'react';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminBooksPage } from './pages/AdminBooksPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { BookDetailsPage } from './pages/BookDetailsPage';
import { BookReaderPage } from './pages/BookReaderPage';
import { HistoryPage } from './pages/HistoryPage';
import { LibraryPage } from './pages/LibraryPage';
import { ListingsPage } from './pages/ListingsPage';
import { LoginPage } from './pages/LoginPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { RequestsPage } from './pages/RequestsPage';

function RootRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? '/dashboard' : '/login'} replace />;
}

function ReaderOnlyRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/books" element={<AdminBooksPage />} />
      <Route path="/admin/categories" element={<AdminCategoriesPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route
        path="/library"
        element={<ReaderOnlyRoute><LibraryPage /></ReaderOnlyRoute>}
      />
      <Route
        path="/listings"
        element={<ReaderOnlyRoute><ListingsPage /></ReaderOnlyRoute>}
      />
      <Route
        path="/requests"
        element={<ReaderOnlyRoute><RequestsPage /></ReaderOnlyRoute>}
      />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/books/:id" element={<BookDetailsPage />} />
      <Route path="/books/read/:id" element={<BookReaderPage />} />
      <Route path="/home" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}