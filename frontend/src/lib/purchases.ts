const STORAGE_KEY = 'bookmaster.mockpurchases';

export interface MockPurchaseRecord {
  catalogueId: number;
  copyId: number | null;
}

type PurchaseStore = Record<string, MockPurchaseRecord[]>;

function normalize(value: unknown): PurchaseStore {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const store: PurchaseStore = {};
  for (const [key, rawList] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(rawList)) continue;
    const records: MockPurchaseRecord[] = [];
    for (const entry of rawList) {
      if (typeof entry === 'number' && Number.isFinite(entry)) {
        records.push({ catalogueId: entry, copyId: null });
      } else if (
        entry !== null &&
        typeof entry === 'object' &&
        typeof (entry as { catalogueId?: unknown }).catalogueId === 'number'
      ) {
        const record = entry as MockPurchaseRecord;
        records.push({
          catalogueId: record.catalogueId,
          copyId: typeof record.copyId === 'number' ? record.copyId : null,
        });
      }
    }
    store[key] = records;
  }
  return store;
}

function readStore(): PurchaseStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return normalize(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeStore(store: PurchaseStore): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function purchasedRecords(userId: number): MockPurchaseRecord[] {
  const list = readStore()[String(userId)];
  return Array.isArray(list) ? list : [];
}

export function hasPurchasedCatalogue(userId: number, catalogueId: number): boolean {
  return purchasedRecords(userId).some((r) => r.catalogueId === catalogueId);
}

export function hasPurchasedCopy(userId: number, copyId: number): boolean {
  return purchasedRecords(userId).some((r) => r.copyId === copyId);
}

export function hasPurchased(userId: number, bookId: number): boolean {
  return purchasedRecords(userId).some((r) => r.catalogueId === bookId || r.copyId === bookId);
}

export function purchasedBookIds(userId: number): number[] {
  return purchasedRecords(userId).map((r) => r.copyId ?? r.catalogueId);
}

export function recordPurchase(userId: number, catalogueId: number, copyId: number): boolean {
  if (!Number.isFinite(userId) || userId <= 0) return false;
  const store = readStore();
  const key = String(userId);
  const list = store[key] ?? [];
  if (list.some((r) => r.copyId === copyId || r.catalogueId === catalogueId)) {
    return true;
  }
  store[key] = [...list, { catalogueId, copyId }];
  return writeStore(store);
}