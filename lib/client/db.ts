// Browser-only key/value store on IndexedDB. Holds the company session token and cached screen data.
// Every call is wrapped so that a browser without IndexedDB (or private mode) degrades to "no cache"
// instead of crashing the app.

const DB_NAME = "efootwear";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = work(transaction.objectStore(STORE));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

export async function getValue<T>(key: string): Promise<T | undefined> {
  try {
    return (await run<T>("readonly", (store) => store.get(key))) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function setValue(key: string, value: unknown): Promise<void> {
  try {
    await run("readwrite", (store) => store.put(value, key));
  } catch {
    // storage unavailable: the app still works online
  }
}

export async function deleteValue(key: string): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(key));
  } catch {
    // ignore
  }
}

/** Removes everything this app stored. Used at sign-out so the next person on the device sees nothing. */
export async function clearAll(): Promise<void> {
  try {
    await run("readwrite", (store) => store.clear());
  } catch {
    // ignore
  }
}
