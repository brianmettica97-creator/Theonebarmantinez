import { addItem, setQuantity, removeItem, sanitizeItems } from './cart.js';

// Persistencia: solo {productId: cantidad} en localStorage (sin datos personales ni precios).
const KEY = 'novantiq-one:cart:v1';
let items = {};
const listeners = new Set();

try { items = sanitizeItems(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { items = {}; }

function commit(next) {
  items = next;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* sin persistencia */ }
  listeners.forEach((fn) => fn(items));
}

export const cartStore = {
  get: () => items,
  add: (id, q = 1) => commit(addItem(items, id, q)),
  set: (id, q) => commit(setQuantity(items, id, q)),
  remove: (id) => commit(removeItem(items, id)),
  clear: () => commit({}),
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
