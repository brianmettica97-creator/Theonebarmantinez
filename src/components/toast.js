import { esc } from '../utils/html.js';

export function toast(message, type = 'info', ms = 4200) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = esc(message);
  host.append(el);
  // Capa superior del navegador: visible incluso encima de <dialog> modales.
  try { host.hidePopover(); host.showPopover(); } catch { /* sin soporte: se muestra normal */ }
  setTimeout(() => el.remove(), ms);
}
