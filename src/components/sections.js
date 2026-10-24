import { esc, safeUrl } from '../utils/html.js';
import { formatDateTime } from '../utils/dates.js';
import { placeholderImage } from '../utils/placeholder.js';
import { IS_DEMO } from '../config/env.js';
import { normalizeWhatsapp } from '../services/whatsapp.js';

const demoChip = (row) => (row?.is_demo ? '<span class="chip demo">Ejemplo</span>' : '');
export const img = (url, label, hue) => safeUrl(url) || placeholderImage(label, hue);

export function stateBlock(title, text) {
  return `<div class="state"><strong>${esc(title)}</strong>${esc(text)}</div>`;
}
export const loadingBlock = (n = 3) => `<div class="grid" aria-busy="true" aria-label="Cargando">${'<div class="skeleton"></div>'.repeat(n)}</div>`;
export const errorBlock = (msg) => `<div class="notice err" role="alert">${esc(msg)}</div>`;

export function sectionHead(id, title, subtitle) {
  return `<div class="section-head"><h2 id="${id}">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>`;
}

export function renderHero(s) {
  const bg = safeUrl(s.hero_image_url);
  const words = String(s.business_name).trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  const rest = words.join(' ');
  return `${bg ? `<img class="hero-img" src="${esc(bg)}" alt="" fetchpriority="high">` : ''}
  <div class="wrap hero-inner">
    <p class="eyebrow">${esc(s.tagline)}</p>
    <h1 id="hero-title">${esc(rest)} <span>${esc(last)}</span></h1>
    <p class="lead">Mirá la carta, descubrí las experiencias y armá tu pedido o reserva desde el celular.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="#carta">Ver la carta</a>
      <a class="btn btn-outline" href="#experiencias">Experiencias</a>
      <a class="btn btn-outline" href="#promociones">Promociones</a>
      <a class="btn btn-outline" href="#contacto">Contacto</a>
    </div>
  </div>`;
}

export function renderPromotions(list) {
  const head = sectionHead('promos-title', 'Promociones', 'Beneficios y combos vigentes.');
  if (!list.length) return head + stateBlock('Sin promociones vigentes', 'Volvé pronto: publicamos novedades en esta sección.');
  return head + `<div class="grid">${list.map((p) => `
    <article class="card promo">
      <img class="media" loading="lazy" src="${esc(img(p.image_url, p.title, 20))}" alt="">
      <div class="card-body">
        <div class="tags">${demoChip(p)}${p.ends_at ? `<span class="chip">Hasta ${esc(formatDateTime(p.ends_at))}</span>` : ''}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        ${p.conditions ? `<p class="small">Condiciones: ${esc(p.conditions)}</p>` : ''}
      </div>
    </article>`).join('')}</div>`;
}

export function renderEvents(list) {
  const head = sectionHead('eventos-title', 'Eventos', 'Próximas fechas confirmadas.');
  if (!list.length) return head + stateBlock('Todavía no hay eventos confirmados', 'Cuando tengamos novedades las vas a ver acá. Podés consultarnos por eventos privados.');
  return head + `<div class="grid">${list.map((e) => `
    <article class="card event">
      <img class="media" loading="lazy" src="${esc(img(e.image_url, e.title, 280))}" alt="">
      <div class="card-body">
        <div class="tags">${demoChip(e)}<span class="chip accent">${esc(formatDateTime(e.starts_at))}</span></div>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.description)}</p>
        ${e.info ? `<p class="small">${esc(e.info)}</p>` : ''}
        <a class="btn btn-outline btn-sm" href="#reservas" data-inquire="${esc(e.title)}">Consultar</a>
      </div>
    </article>`).join('')}</div>`;
}

export function renderExperiences(list) {
  const head = sectionHead('exp-title', 'Experiencias', 'Más que una salida: actividades para compartir.');
  if (!list.length) return head + stateBlock('Próximamente', 'Estamos preparando esta sección.');
  return head + `<div class="grid">${list.map((x) => `
    <article class="card exp">
      <img class="media" loading="lazy" src="${esc(img(x.image_url, x.title, 200))}" alt="">
      <div class="card-body">
        <div class="tags">${demoChip(x)}</div>
        <h3>${esc(x.title)}</h3>
        <p>${esc(x.description)}</p>
        ${x.info ? `<p class="small">${esc(x.info)}</p>` : ''}
        ${(x.faq || []).map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p class="small">${esc(f.a)}</p></details>`).join('')}
        ${x.allow_booking ? `<a class="btn btn-outline btn-sm" href="#reservas" data-reason="${esc(x.title)}">Consultar / reservar</a>` : ''}
      </div>
    </article>`).join('')}</div>`;
}

function socialUrl(value, base) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return safeUrl(v);
  return `${base}${encodeURIComponent(v.replace(/^@/, ''))}`;
}

export function renderContact(s) {
  const items = [];
  if (s.address) items.push(['Dirección', esc(s.address)]);
  if (s.hours) items.push(['Horarios', esc(s.hours)]);
  const wa = normalizeWhatsapp(s.whatsapp);
  if (wa) items.push(['WhatsApp', `<a href="https://wa.me/${wa}">Escribinos</a>`]);
  if (s.phone) items.push(['Teléfono', `<a href="tel:${esc(String(s.phone).replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a>`]);
  const ig = socialUrl(s.instagram, 'https://instagram.com/');
  const fb = socialUrl(s.facebook, 'https://facebook.com/');
  if (ig) items.push(['Instagram', `<a href="${esc(ig)}" rel="noopener" target="_blank">Seguinos</a>`]);
  if (fb) items.push(['Facebook', `<a href="${esc(fb)}" rel="noopener" target="_blank">Seguinos</a>`]);
  const map = /^https:\/\/(www\.google\.com\/maps\/embed|maps\.google\.com|www\.openstreetmap\.org\/export\/embed)/i.test(s.map_embed_url || '') ? s.map_embed_url : '';
  const faq = Array.isArray(s.faq) ? s.faq.filter((f) => f?.q && f?.a) : [];
  const head = sectionHead('contacto-title', 'Contacto y ubicación');
  const body = items.length
    ? `<div class="contact-list">${items.map(([t, v]) => `<div class="card contact-item"><h3>${t}</h3><p>${v}</p></div>`).join('')}</div>`
    : stateBlock('Datos de contacto pendientes', IS_DEMO ? 'En la demo estos datos se configuran desde el panel (Ajustes). No se muestran datos inventados.' : 'Muy pronto.');
  return head + body
    + (map ? `<iframe class="map" title="Mapa de ubicación" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(map)}"></iframe>` : '')
    + (faq.length ? `<h3 style="margin-top:28px">Preguntas frecuentes</h3>${faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p class="small">${esc(f.a)}</p></details>`).join('')}` : '');
}

export function renderFooter(s) {
  return `<div class="wrap">
    <strong>${esc(s.business_name)}</strong>
    ${IS_DEMO ? '<span>Propuesta de demostración desarrollada por <strong>NOVANTIQ</strong>. Los contenidos marcados como “Ejemplo” no son información real del local.</span>' : ''}
    <span><a href="#" data-open-privacy>Política de privacidad</a></span>
  </div>`;
}

export const PRIVACY_HTML = `
<h2>Política de privacidad (borrador)</h2>
<p class="small">Borrador de NOVANTIQ. Debe ser revisado por el titular del negocio y asesoría legal antes de publicarse (Ley 25.326 de Protección de Datos Personales, Argentina).</p>
<p><strong>Qué datos recolectamos:</strong> solo los que ingresás en los formularios de reserva y de consulta de eventos (nombre, medio de contacto, fecha, cantidad de personas, comentarios).</p>
<p><strong>Para qué:</strong> responder tu solicitud. No vendemos ni cedemos tus datos y no usamos herramientas de seguimiento publicitario.</p>
<p><strong>Pedidos por WhatsApp:</strong> el mensaje se arma en tu dispositivo y se envía desde tu propia aplicación de WhatsApp; esta web no lo guarda.</p>
<p><strong>Tus derechos:</strong> podés pedir acceso, rectificación o supresión de tus datos contactando al local por los medios publicados.</p>`;
