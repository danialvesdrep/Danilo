// store.js — Estado simples + IndexedDB para feedbacks/reações.
// Sem dependências.

const DB_NAME = 'boletim-danilo';
const DB_VERSION = 1;
const STORE_REACTIONS = 'reactions';
const STORE_COMMENTS = 'comments';

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_REACTIONS)) {
        db.createObjectStore(STORE_REACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_COMMENTS)) {
        db.createObjectStore(STORE_COMMENTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

// reaction id format: `${date}::${itemHash}::${type}` (saber-mais | urgente)
function reactionId(date, itemHash, type) {
  return `${date}::${itemHash}::${type}`;
}
function commentId(date, itemHash) {
  return `${date}::${itemHash}`;
}

export async function setReaction(date, itemHash, type, on) {
  const id = reactionId(date, itemHash, type);
  if (on) {
    await tx(STORE_REACTIONS, 'readwrite', s => s.put({
      id, date, itemHash, type, ts: Date.now()
    }));
  } else {
    await tx(STORE_REACTIONS, 'readwrite', s => s.delete(id));
  }
}

export async function getReactions(date) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_REACTIONS, 'readonly');
    const out = [];
    t.objectStore(STORE_REACTIONS).openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return;
      if (!date || c.value.date === date) out.push(c.value);
      c.continue();
    };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}

export async function setComment(date, itemHash, text) {
  const id = commentId(date, itemHash);
  if (text && text.trim()) {
    await tx(STORE_COMMENTS, 'readwrite', s => s.put({
      id, date, itemHash, text: text.trim(), ts: Date.now()
    }));
  } else {
    await tx(STORE_COMMENTS, 'readwrite', s => s.delete(id));
  }
}

export async function getComment(date, itemHash) {
  const id = commentId(date, itemHash);
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const t = db.transaction(STORE_COMMENTS, 'readonly');
    const req = t.objectStore(STORE_COMMENTS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllComments(date) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_COMMENTS, 'readonly');
    const out = [];
    t.objectStore(STORE_COMMENTS).openCursor().onsuccess = (e) => {
      const c = e.target.result;
      if (!c) return;
      if (!date || c.value.date === date) out.push(c.value);
      c.continue();
    };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}

// Hash estável de string (djb2). Usado como itemHash a partir do headline+url.
export function hashItem(item) {
  const s = `${item.headline || ''}::${item.url || ''}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return ('00000000' + (h >>> 0).toString(36)).slice(-8);
}

// Pub/sub mínimo
const listeners = {};
export function on(event, fn) {
  (listeners[event] ||= []).push(fn);
}
export function emit(event, payload) {
  (listeners[event] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
}

// Theme & onboarding flag — localStorage (ok para preferências leves)
export const prefs = {
  getTheme()    { return localStorage.getItem('theme') || 'dark'; },
  setTheme(t)   { localStorage.setItem('theme', t); },
  getOnbDone()  { return localStorage.getItem('onb-done') === '1'; },
  setOnbDone()  { localStorage.setItem('onb-done', '1'); },
  getScroll(date) { return parseFloat(localStorage.getItem('scroll::' + date) || '0'); },
  setScroll(date, y) { localStorage.setItem('scroll::' + date, String(y)); },
};
