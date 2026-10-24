// Los importes se manejan siempre en CENTAVOS (enteros) para evitar errores de punto flotante.
const opts = { style: 'currency', currency: 'ARS' };
const fmtWhole = new Intl.NumberFormat('es-AR', { ...opts, minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtFull = new Intl.NumberFormat('es-AR', { ...opts, minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(cents) {
  if (!Number.isInteger(cents)) return '—';
  return (cents % 100 === 0 ? fmtWhole : fmtFull).format(cents / 100);
}

/** Convierte texto de un input ("1.250,50" o "1250.5") a centavos. Devuelve null si es inválido. */
export function parsePesosToCents(input) {
  if (input === null || input === undefined) return null;
  let s = String(input).trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ''] = s.split('.');
  const cents = Number(int) * 100 + Number((dec + '00').slice(0, 2)) * (int.startsWith('-') ? -1 : 1);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

export function centsToInput(cents) {
  if (!Number.isInteger(cents)) return '';
  const whole = Math.trunc(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(whole) : `${whole},${String(rest).padStart(2, '0')}`;
}
