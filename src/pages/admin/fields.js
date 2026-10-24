import { esc } from '../../utils/html.js';
import { centsToInput, parsePesosToCents } from '../../utils/money.js';
import { isoToLocalInput, localInputToIso } from '../../utils/dates.js';
import { normalizeWhatsapp } from '../../services/whatsapp.js';
import { MAX_IMAGE_MB } from '../../config/env.js';
import { placeholderImage } from '../../utils/placeholder.js';

const wrap = (f, inner, extra = '') =>
  `<div class="field ${f.full ? 'full' : ''}" data-field="${f.key}"><label for="f-${f.key}">${esc(f.label)}${f.required ? ' *' : ''}</label>${inner}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}${extra}<span class="field-error" id="e-${f.key}" role="alert"></span></div>`;

export const faqToText = (arr) => (Array.isArray(arr) ? arr : []).map((x) => `${x.q} | ${x.a}`).join('\n');
export const textToFaq = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [q, ...a] = l.split('|'); return { q: q.trim(), a: a.join('|').trim() }; }).filter((x) => x.q && x.a);

export function renderField(f, value, ctx) {
  const id = `f-${f.key}`; const v = value ?? f.default ?? '';
  switch (f.type) {
    case 'text': return wrap(f, `<input id="${id}" name="${f.key}" value="${esc(v)}" ${f.max ? `maxlength="${f.max}"` : ''} ${f.required ? 'required' : ''}>`);
    case 'textarea': return wrap(f, `<textarea id="${id}" name="${f.key}" ${f.max ? `maxlength="${f.max}"` : ''}>${esc(v)}</textarea>`);
    case 'number': return wrap(f, `<input id="${id}" name="${f.key}" type="number" inputmode="numeric" step="1" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} value="${esc(v)}">`);
    case 'money': return wrap(f, `<input id="${id}" name="${f.key}" inputmode="decimal" value="${esc(centsToInput(value))}" ${f.required ? 'required' : ''}>`);
    case 'color': return wrap(f, `<input id="${id}" name="${f.key}" type="color" value="${esc(v || '#ff9d2e')}" style="padding:4px;height:46px">`);
    case 'checkbox': return `<div class="field" data-field="${f.key}"><label class="check"><input id="${id}" name="${f.key}" type="checkbox" ${(value ?? f.default) ? 'checked' : ''}> <span>${esc(f.label)}</span></label></div>`;
    case 'select': return wrap(f, `<select id="${id}" name="${f.key}" ${f.required ? 'required' : ''}>${f.required ? '<option value="">Elegir…</option>' : ''}${f.options(ctx).map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`);
    case 'datetime': return wrap(f, `<input id="${id}" name="${f.key}" type="datetime-local" value="${esc(isoToLocalInput(value))}" ${f.required ? 'required' : ''}>`);
    case 'tags': return wrap(f, `<input id="${id}" name="${f.key}" value="${esc((value || []).join(', '))}">`);
    case 'faq': return wrap(f, `<textarea id="${id}" name="${f.key}" placeholder="¿Cómo reservo? | Respuesta…">${esc(faqToText(value))}</textarea>`);
    case 'image': return wrap(f, `<div class="img-field"><img id="prev-${f.key}" src="${esc(value || placeholderImage('Sin imagen'))}" alt="Vista previa"><div><input type="file" id="${id}" accept="image/jpeg,image/png,image/webp" data-image-for="${f.key}" data-folder="${esc(f.folder || ctx.folder || 'general')}"><span class="hint">JPG, PNG o WebP · máx. ${MAX_IMAGE_MB} MB · se optimiza automáticamente</span><br><button type="button" class="btn btn-outline btn-sm" data-clear-image="${f.key}">Quitar imagen</button></div></div><input type="hidden" name="${f.key}" value="${esc(value || '')}">`);
    default: return '';
  }
}

/** Lee y valida un campo. Devuelve {value} o {error}. */
export function readField(f, form) {
  const el = form.elements[f.key];
  const raw = el?.type === 'checkbox' ? el.checked : (el?.value ?? '');
  const str = typeof raw === 'string' ? raw.trim() : raw;
  const need = (m) => ({ error: m });
  switch (f.type) {
    case 'checkbox': return { value: !!raw };
    case 'number': { if (str === '') return f.required ? need('Obligatorio.') : { value: f.default ?? 0 }; const n = Number(str); if (!Number.isInteger(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) return need(`Número entero${f.min != null ? ` entre ${f.min} y ${f.max}` : ''}.`); return { value: n }; }
    case 'money': { const c = parsePesosToCents(str); if (c === null) return need('Precio inválido.'); if (c > 100000000) return need('Precio demasiado alto.'); return { value: c }; }
    case 'datetime': { if (!str) return f.required ? need('Obligatorio.') : { value: null }; const iso = localInputToIso(str); return iso ? { value: iso } : need('Fecha inválida.'); }
    case 'tags': return { value: str.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8) };
    case 'faq': return { value: textToFaq(str) };
    case 'image': return { value: str };
    case 'color': return /^#[0-9a-f]{6}$/i.test(str) ? { value: str } : need('Color inválido.');
    default:
      if (f.required && !str) return need('Obligatorio.');
      if (f.max && str.length > f.max) return need(`Máximo ${f.max} caracteres.`);
      if (f.kind === 'whatsapp' && str && !normalizeWhatsapp(str)) return need('Número inválido. Usá formato internacional, ej: +54 9 11 1234-5678.');
      return { value: str };
  }
}

export function collectForm(fields, form) {
  const data = {}; const errors = {};
  for (const f of fields) { const r = readField(f, form); if (r.error) errors[f.key] = r.error; else data[f.key] = r.value; }
  return { data, errors };
}

export function showFieldErrors(form, errors) {
  form.querySelectorAll('.field.invalid').forEach((x) => x.classList.remove('invalid'));
  form.querySelectorAll('.field-error').forEach((x) => (x.textContent = ''));
  let first = true;
  for (const [k, m] of Object.entries(errors)) {
    form.querySelector(`[data-field="${k}"]`)?.classList.add('invalid');
    const e = form.querySelector(`#e-${k}`); if (e) e.textContent = m;
    if (first) { form.elements[k]?.focus?.(); first = false; }
  }
}
