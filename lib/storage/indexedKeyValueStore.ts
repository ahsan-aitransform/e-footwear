// Browser-only key/value store on IndexedDB. Holds the stored session and cached screen data.
// Every call is wrapped so that a browser without IndexedDB (or in private mode) degrades to "nothing stored"
// instead of crashing the application.
import { INDEXED_DATABASE_KEY_VALUE_STORE_NAME, INDEXED_DATABASE_NAME } from "@/lib/constants/browserStorageKeys";

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEXED_DATABASE_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(INDEXED_DATABASE_KEY_VALUE_STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return databasePromise;
}

function runInTransaction<TResult>(
  mode: IDBTransactionMode,
  work: (objectStore: IDBObjectStore) => IDBRequest<TResult>,
): Promise<TResult | undefined> {
  return openDatabase().then(
    (database) =>
      new Promise<TResult | undefined>((resolve, reject) => {
        const transaction = database.transaction(INDEXED_DATABASE_KEY_VALUE_STORE_NAME, mode);
        const request = work(transaction.objectStore(INDEXED_DATABASE_KEY_VALUE_STORE_NAME));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

export async function readStoredValue<TValue>(key: string): Promise<TValue | undefined> {
  try {
    return (await runInTransaction<TValue>("readonly", (objectStore) => objectStore.get(key))) as TValue | undefined;
  } catch {
    return undefined;
  }
}

export async function writeStoredValue(key: string, value: unknown): Promise<void> {
  try {
    await runInTransaction("readwrite", (objectStore) => objectStore.put(value, key));
  } catch {
    // storage unavailable: the application still works online
  }
}

export async function deleteStoredValue(key: string): Promise<void> {
  try {
    await runInTransaction("readwrite", (objectStore) => objectStore.delete(key));
  } catch {
    // ignore
  }
}

// Removes everything this application stored. Used at sign-out so the next person on the device sees nothing.
export async function clearAllStoredValues(): Promise<void> {
  try {
    await runInTransaction("readwrite", (objectStore) => objectStore.clear());
  } catch {
    // ignore
  }
}

// Test helper: closes the cached connection so a test can start from a fresh database.
export async function resetIndexedKeyValueStoreForTests(): Promise<void> {
  if (databasePromise) {
    try {
      (await databasePromise).close();
    } catch {
      // ignore
    }
  }
  databasePromise = null;
}
