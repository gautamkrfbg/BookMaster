export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type BookStatus = 'OWNED' | 'LISTED' | 'EXCHANGED' | string;
export type RequirementStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;

export interface BookListItem {
  id: number;
  title: string;
  ownerId: number;
  categoryId: number;
  status: BookStatus;
}

export interface CategoryItem {
  id: number;
  name: string;
}

export interface ExchangeListingItem {
  id: number;
  bookId: number;
  wantedType: string;
}

export interface ExchangeRequestItem {
  id: number;
  listingId: number;
  requesterId: number;
  offeredBookId: number;
  status: RequirementStatus;
}

export interface NotificationItem {
  id: number;
  userId: number;
  isRead: boolean;
}

export interface HistoryItem {
  id: number;
  requestId: number;
  completedAt: string | null;
}

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AdminStats {
  users: number;
  books: number;
  categories: number;
  listings: number;
  requests: number;
  pendingRequests: number;
  exchangesCompleted: number;
}