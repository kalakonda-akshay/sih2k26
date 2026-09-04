/**
 * Offline queue for field incident reports.
 *
 * ## Why IndexedDB and not localStorage
 *
 * A report can carry a photograph. localStorage stores strings only, so a
 * photo would have to be base64-encoded — inflating it by a third and pushing
 * a multi-megabyte image against a 5 MB origin quota. IndexedDB stores the
 * Blob directly.
 *
 * ## The guarantee this makes, and the one it does not
 *
 * A queued report is *durable* — it survives a closed tab, a reboot, and a
 * dead battery. It is **not** sent. The UI must never merge these two states:
 * an officer who believes a landslide has been reported stops trying to
 * report it, so "queued" and "delivered" are shown as different things.
 *
 * Draining happens while the app is open, on reconnect. There is no
 * Background Sync handler in the service worker, because replaying a write
 * from a worker needs a public HTTP write endpoint, and this application has
 * no authentication to put in front of one yet.
 */

const DB_NAME = "ner-vision-offline";
const DB_VERSION = 1;
const STORE = "pending-reports";

export interface QueuedReport {
  /** Idempotency key. Also the primary key here, so a report cannot double-queue. */
  clientUuid: string;
  /** When the officer pressed submit — preserved separately from arrival time. */
  deviceTs: number;
  queuedAt: number;
  attempts: number;
  lastError?: string;
  payload: {
    incidentType: string;
    description: string;
    severity: string;
    latitude: number;
    longitude: number;
    locationName: string;
    state: string;
    district: string;
    reportedBy: string;
  };
  photo?: Blob;
  photoType?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientUuid" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

/** IndexedDB is unavailable in some privacy modes; callers must cope. */
export function isQueueAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export async function enqueueReport(report: QueuedReport): Promise<void> {
  await tx("readwrite", (store) => store.put(report));
  // Writes notify the store themselves, so an indicator appears the moment a
  // report is queued rather than on the next reload.
  await refreshPendingCount();
}

export async function listPending(): Promise<QueuedReport[]> {
  const all = await tx<QueuedReport[]>("readonly", (store) => store.getAll());
  // Oldest first: reports are delivered in the order they were observed.
  return all.sort((a, b) => a.deviceTs - b.deviceTs);
}

export async function countPending(): Promise<number> {
  return await tx<number>("readonly", (store) => store.count());
}

export async function removePending(clientUuid: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(clientUuid));
  await refreshPendingCount();
}

export async function markAttempt(
  clientUuid: string,
  error: string,
): Promise<void> {
  const existing = await tx<QueuedReport | undefined>("readonly", (store) =>
    store.get(clientUuid),
  );
  if (!existing) return;
  await enqueueReport({
    ...existing,
    attempts: existing.attempts + 1,
    lastError: error,
  });
}

/** A stable id for a report, generated once and reused across every retry. */
export function newClientUuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Whether a failure looks like a lost connection rather than a rejected
 * report. A validation error should surface to the officer immediately;
 * only transport failures are worth queueing and retrying.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("offline") ||
    message.includes("connection") ||
    message.includes("timeout")
  );
}

/* ------------------------------------------------------------- live count */

/**
 * The pending count as an external store.
 *
 * IndexedDB is external state, so React should *subscribe* to it rather than
 * copy it into component state on mount. Keeping the count in a module store
 * lets `useSyncExternalStore` read it synchronously — which avoids the
 * cascading re-render that setting it from an effect body causes, and means
 * every mounted queue indicator agrees without prop drilling.
 */
let cachedCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribePendingCount(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getPendingCount(): number {
  return cachedCount;
}

/** Server render has no IndexedDB; zero is the only honest snapshot. */
export function getServerPendingCount(): number {
  return 0;
}

/** Re-read the queue and notify subscribers. Safe to call at any time. */
export async function refreshPendingCount(): Promise<void> {
  if (!isQueueAvailable()) return;
  try {
    const next = await countPending();
    if (next !== cachedCount) {
      cachedCount = next;
      emit();
    }
  } catch {
    // A blocked IndexedDB means no queue; never break the caller.
  }
}
