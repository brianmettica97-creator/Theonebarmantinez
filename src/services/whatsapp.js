import { formatMoney } from '../utils/money.js';

/**
 * Normaliza un número a formato internacional solo dígitos (E.164 sin "+").
 * Acepta "+54 9 11 1234-5678", "5491112345678". No inventa prefijos: si no hay código de país
 * (no empieza con +, ni con 54) devuelve null para que se configure completo.
 */
export function normalizeWhatsapp(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  if (/[^\d\s+()\-.]/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  if (!raw.startsWith('+') && !digits.startsWith('54')) return null;
  return digits;
}

export const isWhatsappConfigured = (input) => normalizeWhatsapp(input) !== null;

export function buildOrderMessage({ lines, totalCents, customerName, notes, demo, businessName }) {
  const out = [];
  if (demo) out.push('*[PEDIDO DE DEMOSTRACIÓN - NO ES UN PEDIDO REAL]*', '');
  out.push(`Hola${businessName ? ` ${businessName}` : ''}, quiero hacer este pedido:`, '');
  for (const l of lines) {
    out.push(`• ${l.quantity} x ${l.name} — ${formatMoney(l.unitPriceCents)} c/u = ${formatMoney(l.subtotalCents)}`);
  }
  out.push('', `*Total: ${formatMoney(totalCents)}*`);
  if (customerName) out.push('', `Nombre: ${customerName}`);
  if (notes) out.push(`Observaciones: ${notes}`);
  out.push('', 'Quedo a la espera de su confirmación.');
  return out.join('\n');
}

export function buildWhatsappUrl(phone, message) {
  const n = normalizeWhatsapp(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
