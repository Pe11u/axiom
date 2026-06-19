const DB_NAME    = 'axiom-storage';
const DB_VERSION = 1;
const STORE      = 'kv';

let _db: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = (e.target as IDBOpenDBRequest).result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = () => { _db = null; reject(req.error); };
  });
  return _db;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const store = (await db()).transaction(STORE, 'readonly').objectStore(STORE);
  return new Promise((resolve, reject) => {
    const r = store.get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror   = () => reject(r.error);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const store = (await db()).transaction(STORE, 'readwrite').objectStore(STORE);
  return new Promise((resolve, reject) => {
    const r = store.put(value, key);
    r.onsuccess = () => resolve();
    r.onerror   = () => reject(r.error);
  });
}
