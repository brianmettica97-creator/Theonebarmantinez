import { addDays, isValidDateString, localDateString } from '../utils/dates.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+\d][\d\s()\-.]{6,24}$/;

export const LIMITS = { name: 80, contact: 120, text: 1000, reason: 120, maxDaysAhead: 365 };

export function isValidContact(v) {
  const s = String(v ?? '').trim();
  if (EMAIL.test(s)) return true;
  return PHONE.test(s) && s.replace(/\D/g, '').length >= 8 && s.replace(/\D/g, '').length <= 15;
}

function common(d, errors) {
  const name = String(d.name ?? '').trim();
  if (name.length < 2) errors.name = 'Ingresá tu nombre (mínimo 2 caracteres).';
  else if (name.length > LIMITS.name) errors.name = `Máximo ${LIMITS.name} caracteres.`;
  if (!isValidContact(d.contact)) errors.contact = 'Ingresá un teléfono (con código de área) o un email válido.';
  if (String(d.comments ?? d.message ?? '').length > LIMITS.text) errors.comments = `Máximo ${LIMITS.text} caracteres.`;
  if (!d.consent) errors.consent = 'Necesitamos tu consentimiento para usar tus datos y responderte.';
}

export function validateReservation(d, { maxParty = 20, today = localDateString() } = {}) {
  const errors = {};
  common(d, errors);
  if (!isValidDateString(d.requested_date)) errors.requested_date = 'Elegí una fecha válida.';
  else if (d.requested_date < today) errors.requested_date = 'La fecha no puede ser pasada.';
  else if (d.requested_date > addDays(today, LIMITS.maxDaysAhead)) errors.requested_date = 'La fecha es demasiado lejana.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.requested_time || '')) errors.requested_time = 'Indicá un horario válido.';
  const n = Number(d.party_size);
  if (!Number.isInteger(n) || n < 1) errors.party_size = 'Indicá la cantidad de personas.';
  else if (n > maxParty) errors.party_size = `Para más de ${maxParty} personas, usá la consulta de eventos privados.`;
  if (String(d.reason ?? '').length > LIMITS.reason) errors.reason = `Máximo ${LIMITS.reason} caracteres.`;
  return errors;
}

export function validateInquiry(d, { today = localDateString() } = {}) {
  const errors = {};
  common(d, errors);
  if (String(d.event_type ?? '').trim().length < 2) errors.event_type = 'Indicá el tipo de evento.';
  if (d.estimated_date) {
    if (!isValidDateString(d.estimated_date)) errors.estimated_date = 'Fecha inválida.';
    else if (d.estimated_date < today) errors.estimated_date = 'La fecha no puede ser pasada.';
  }
  const g = Number(d.guests);
  if (!Number.isInteger(g) || g < 1 || g > 2000) errors.guests = 'Indicá una cantidad aproximada de invitados (1 a 2000).';
  return errors;
}

/** Reglas de imagen para subidas del panel. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function validateImageFile(file, maxMb) {
  if (!file) return 'No se seleccionó ningún archivo.';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Formato no permitido. Usá JPG, PNG o WebP.';
  if (file.size > maxMb * 1024 * 1024) return `La imagen supera el máximo de ${maxMb} MB.`;
  return null;
}
