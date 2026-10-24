import { esc } from '../utils/html.js';
import { localDateString, addDays } from '../utils/dates.js';
import { validateReservation, validateInquiry } from '../services/validators.js';
import { repo } from '../repositories/index.js';
import { IS_DEMO } from '../config/env.js';
import { sectionHead } from './sections.js';

const field = (id, label, control, hint = '', cls = '') =>
  `<div class="field ${cls}" data-field="${id}"><label for="${id}">${label}</label>${control}${hint ? `<span class="hint">${hint}</span>` : ''}<span class="field-error" id="${id}-err" role="alert"></span></div>`;

const common = (prefix) => `
  ${field(`${prefix}-name`, 'Nombre y apellido', `<input id="${prefix}-name" name="name" maxlength="80" autocomplete="name" required aria-describedby="${prefix}-name-err">`)}
  ${field(`${prefix}-contact`, 'Teléfono o email', `<input id="${prefix}-contact" name="contact" maxlength="120" autocomplete="tel" inputmode="text" required aria-describedby="${prefix}-contact-err">`, 'Por este medio te respondemos.')}`;

function consentAndSubmit(prefix, label) {
  return `
  <div class="hp" aria-hidden="true"><label>No completar este campo <input name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="field" data-field="${prefix}-consent"><label class="check"><input type="checkbox" id="${prefix}-consent" name="consent"> <span>Acepto que usen mis datos para responder esta solicitud (<a href="#" data-open-privacy>política de privacidad</a>).</span></label><span class="field-error" id="${prefix}-consent-err" role="alert"></span></div>
  <button class="btn btn-primary" type="submit">${label}</button>`;
}

export function renderRequests(settings) {
  const demoNote = IS_DEMO ? '<p class="notice warn">DEMO: las solicitudes se guardan solo en este navegador y <strong>no llegan al local</strong>.</p>' : '';
  const resOn = settings.reservations_enabled;
  const invOn = settings.private_events_enabled;
  return sectionHead('reservas-title', 'Reservas y eventos', 'Dejanos tu solicitud. No es una reserva confirmada hasta que el local te responda.')
    + demoNote
    + `<div class="card form-card">
      <div class="tab-switch" role="group" aria-label="Tipo de solicitud">
        ${resOn ? '<button class="tab" type="button" data-form="res" aria-pressed="true">Reservar mesa</button>' : ''}
        ${invOn ? `<button class="tab" type="button" data-form="inq" aria-pressed="${!resOn}">Cumpleaños y eventos privados</button>` : ''}
      </div>
      ${!resOn && !invOn ? '<div class="notice warn">Las solicitudes online están desactivadas por el momento.</div>' : ''}
      ${resOn ? `<form id="res-form" novalidate class="form-grid" data-kind="res">
        <div class="full">${common('res')}</div>
        ${field('res-date', 'Fecha', `<input id="res-date" name="requested_date" type="date" min="${localDateString()}" max="${addDays(localDateString(), 365)}" required>`)}
        ${field('res-time', 'Horario', '<input id="res-time" name="requested_time" type="time" required>', 'Sujeto a confirmación del local.')}
        ${field('res-party', 'Personas', `<input id="res-party" name="party_size" type="number" min="1" max="${settings.reservations_max_party}" inputmode="numeric" required>`, `Hasta ${settings.reservations_max_party}. Para más, usá eventos privados.`)}
        ${field('res-reason', 'Motivo (opcional)', '<input id="res-reason" name="reason" maxlength="120" placeholder="Cumpleaños, encuentro…">')}
        <div class="full">${field('res-comments', 'Comentarios (opcional)', '<textarea id="res-comments" name="comments" maxlength="1000"></textarea>')}
        <p class="small">${esc(settings.reservations_note)}</p>${consentAndSubmit('res', 'Enviar solicitud de reserva')}</div>
      </form>` : ''}
      ${invOn ? `<form id="inq-form" novalidate class="form-grid" data-kind="inq" ${resOn ? 'hidden' : ''}>
        <div class="full">${common('inq')}</div>
        ${field('inq-type', 'Tipo de evento', '<input id="inq-type" name="event_type" maxlength="80" placeholder="Cumpleaños, reunión…" required>')}
        ${field('inq-date', 'Fecha estimada (opcional)', `<input id="inq-date" name="estimated_date" type="date" min="${localDateString()}">`)}
        ${field('inq-guests', 'Invitados aprox.', '<input id="inq-guests" name="guests" type="number" min="1" max="2000" inputmode="numeric" required>')}
        <div class="full">${field('inq-comments', 'Mensaje (opcional)', '<textarea id="inq-comments" name="comments" maxlength="1000"></textarea>')}
        <p class="small">No mostramos presupuestos automáticos: el local te contacta con una propuesta.</p>${consentAndSubmit('inq', 'Enviar consulta')}</div>
      </form>` : ''}
      <div id="form-result" aria-live="polite"></div>
    </div>`;
}

const FIELD_ID = { name: 'name', contact: 'contact', requested_date: 'date', requested_time: 'time', party_size: 'party', reason: 'reason', comments: 'comments', consent: 'consent', event_type: 'type', estimated_date: 'date', guests: 'guests' };

function showErrors(form, prefix, errors) {
  form.querySelectorAll('.field').forEach((f) => f.classList.remove('invalid'));
  form.querySelectorAll('.field-error').forEach((e) => (e.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  let first = null;
  for (const [key, msg] of Object.entries(errors)) {
    const id = `${prefix}-${FIELD_ID[key] ?? key}`;
    const wrap = form.querySelector(`[data-field="${id}"]`);
    const input = form.querySelector(`#${id}`);
    wrap?.classList.add('invalid');
    const err = form.querySelector(`#${id}-err`); if (err) err.textContent = msg;
    input?.setAttribute('aria-invalid', 'true');
    first ||= input;
  }
  first?.focus();
}

export function initRequests(root, getSettings, { prefillReason } = {}) {
  const result = root.querySelector('#form-result');
  root.querySelectorAll('[data-form]').forEach((b) => b.addEventListener('click', () => {
    root.querySelectorAll('[data-form]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    root.querySelector('#res-form')?.toggleAttribute('hidden', b.dataset.form !== 'res');
    root.querySelector('#inq-form')?.toggleAttribute('hidden', b.dataset.form !== 'inq');
    result.innerHTML = '';
  }));

  root.querySelectorAll('form').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kind = form.dataset.kind; const prefix = kind;
    const fd = Object.fromEntries(new FormData(form));
    fd.consent = form.querySelector('[name="consent"]').checked;
    const settings = getSettings();
    const errors = kind === 'res' ? validateReservation(fd, { maxParty: settings.reservations_max_party }) : validateInquiry(fd);
    showErrors(form, prefix, errors);
    if (Object.keys(errors).length) return;
    const btn = form.querySelector('button[type="submit"]'); const label = btn.textContent;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando…'; result.innerHTML = '';
    try {
      await (kind === 'res' ? repo.submitReservation(fd, { maxParty: settings.reservations_max_party }) : repo.submitInquiry(fd));
      form.reset();
      result.innerHTML = `<div class="notice ok" role="status"><strong>${IS_DEMO ? 'Solicitud de demostración guardada en este navegador.' : 'Recibimos tu solicitud.'}</strong><br>${kind === 'res' ? 'Está <strong>pendiente de confirmación</strong>: el local te contactará para confirmarla o proponerte otra opción.' : 'El local se va a comunicar con vos.'}</div>`;
    } catch (err) {
      if (err.errors) showErrors(form, prefix, err.errors);
      else result.innerHTML = `<div class="notice err" role="alert">${esc(err.message || 'No pudimos enviar la solicitud. Revisá tu conexión e intentá de nuevo.')}</div>`;
    } finally { btn.disabled = false; btn.textContent = label; }
  }));

  return {
    prefill(reason, toInquiry) {
      if (toInquiry) { root.querySelector('[data-form="inq"]')?.click(); const t = root.querySelector('#inq-comments'); if (t && reason) t.value = `Consulta por: ${reason}`; }
      else { const r = root.querySelector('#res-reason'); if (r && reason) r.value = reason; }
    },
  };
}
