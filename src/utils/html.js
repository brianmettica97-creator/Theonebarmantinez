// Escapado para plantillas HTML: toda cadena dinámica debe pasar por esc() (prevención de XSS).
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"'`]/g, (c) => MAP[c]);

/** Solo permite URLs http(s), rutas relativas o data:image/ (para imágenes). */
export function safeUrl(url) {
  const u = String(url ?? '').trim();
  if (!u) return '';
  if (/^(https:\/\/|http:\/\/|\/|\.\/|\.\.\/)/i.test(u)) return u;
  if (/^data:image\/(png|jpe?g|webp|svg\+xml);/i.test(u)) return u;
  return '';
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function slugify(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
