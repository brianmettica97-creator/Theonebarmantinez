// Almacenamiento local SOLO para la demo sin backend. Los datos viven en el navegador del visitante.
import { buildDemoSeed } from '../data/demoSeed.js';
import { uid } from '../utils/html.js';

const PREFIX = 'novantiq-one:v1:';
const mem = new Map(); // respaldo si localStorage no está disponible (modo privado)

function read(table) {
  const key = PREFIX + table;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* usar respaldo */ }
  if (mem.has(key)) return mem.get(key);
  const seed = buildDemoSeed()[table] ?? [];
  write(table, seed);
  return seed;
}

function write(table, rows) {
  const key = PREFIX + table;
  mem.set(key, rows);
  try { localStorage.setItem(key, JSON.stringify(rows)); } catch (e) {
    if (e?.name === 'QuotaExceededError') throw new Error('Almacenamiento local lleno: usá imágenes más livianas.');
  }
}

export const localStore = {
  kind: 'local',
  async list(table) { return structuredClone(read(table)); },
  async upsert(table, row) {
    const rows = read(table);
    const clean = { ...row, id: row.id || uid() };
    const i = rows.findIndex((r) => r.id === clean.id);
    const next = i >= 0 ? { ...rows[i], ...clean } : { created_at: new Date().toISOString(), ...clean };
    if (i >= 0) rows[i] = next; else rows.push(next);
    write(table, rows);
    return structuredClone(next);
  },
  async update(table, id, patch) {
    const rows = read(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error('Registro no encontrado');
    rows[i] = { ...rows[i], ...patch };
    write(table, rows);
    return structuredClone(rows[i]);
  },
  async remove(table, id) { write(table, read(table).filter((r) => r.id !== id)); },
  async reset() {
    for (const t of Object.keys(buildDemoSeed())) { try { localStorage.removeItem(PREFIX + t); } catch { /* noop */ } mem.delete(PREFIX + t); }
  },
};
