import '../../styles/base.css';
import '../../styles/public.css';
import { repo } from '../../repositories/index.js';
import { CONFIG_ERROR, IS_DEMO, BACKEND } from '../../config/env.js';
import { DEFAULT_SETTINGS } from '../../config/defaults.js';
import { esc, $, $$ } from '../../utils/html.js';
import { toast } from '../../components/toast.js';
import * as S from '../../components/sections.js';
import { renderMenuShell, renderMenuTabs, renderMenuGrid } from '../../components/menu.js';
import { initCart } from '../../components/cartDrawer.js';
import { renderRequests, initRequests } from '../../components/forms.js';
import { cartStore } from '../../services/cartStore.js';

const state = { settings: DEFAULT_SETTINGS, categories: [], products: [], cat: 'all', query: '' };
const el = (id) => document.getElementById(id);

function applyBrand(s) {
  document.documentElement.style.setProperty('--accent', /^#[0-9a-f]{6}$/i.test(s.accent_color) ? s.accent_color : DEFAULT_SETTINGS.accent_color);
  document.title = `${s.business_name} · Carta, experiencias y reservas`;
  const logo = /^https?:|^data:image\//.test(s.logo_url || '') ? `<img src="${esc(s.logo_url)}" alt="">` : '';
  el('brand').innerHTML = `${logo}<span>${esc(s.business_name)}</span>`;
  el('demo-banner').innerHTML = IS_DEMO ? '<strong>VERSIÓN DE DEMOSTRACIÓN</strong> · Propuesta de NOVANTIQ. Datos, precios y fotos son de ejemplo.' : '';
  el('site-footer').innerHTML = S.renderFooter(s);
}

function renderMenu() {
  const { categories, products, settings } = state;
  el('menu-tabs').innerHTML = renderMenuTabs(categories, state.cat);
  el('menu-grid').innerHTML = renderMenuGrid({ products, categories }, state, settings.orders_enabled);
}

async function loadCatalog() {
  const c = await repo.getPublicCatalog();
  Object.assign(state, { settings: c.settings, categories: c.categories, products: c.products });
}

async function boot() {
  applyBrand(state.settings);
  if (CONFIG_ERROR) {
    el('inicio').innerHTML = `<div class="wrap hero-inner">${S.errorBlock(CONFIG_ERROR)}</div>`;
    return;
  }
  el('inicio').innerHTML = S.renderHero(state.settings);
  for (const id of ['carta', 'promociones', 'experiencias', 'eventos']) el(id).innerHTML = `<div class="wrap">${S.loadingBlock()}</div>`;

  let cart;
  const dlg = el('cart-dialog');
  cart = initCart({ dialog: dlg, countEl: el('cart-count'), getState: () => state, refreshCatalog: async () => { await loadCatalog(); renderMenu(); } });
  el('cart-open').addEventListener('click', () => cart.open());

  try {
    const [, promos, events, exps] = await Promise.all([loadCatalog(), repo.getPublicPromotions(), repo.getPublicEvents(), repo.getPublicExperiences()]);
    applyBrand(state.settings);
    el('inicio').innerHTML = S.renderHero(state.settings);
    el('carta').innerHTML = `<div class="wrap">${renderMenuShell(state.settings)}</div>`;
    renderMenu();
    el('promociones').innerHTML = `<div class="wrap">${S.renderPromotions(promos)}</div>`;
    el('experiencias').innerHTML = `<div class="wrap">${S.renderExperiences(exps)}</div>`;
    el('eventos').innerHTML = `<div class="wrap">${S.renderEvents(events)}</div>`;
    el('reservas').innerHTML = `<div class="wrap">${renderRequests(state.settings)}</div>`;
    el('contacto').innerHTML = `<div class="wrap">${S.renderContact(state.settings)}</div>`;
    cart.render();
    const forms = initRequests(el('reservas'), () => state.settings);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-reason],[data-inquire]');
      if (a) setTimeout(() => forms.prefill(a.dataset.reason ?? a.dataset.inquire, 'inquire' in a.dataset), 50);
    });
    // Búsqueda y filtros
    el('menu-search')?.addEventListener('input', (e) => { state.query = e.target.value; el('menu-grid').innerHTML = renderMenuGrid(state, state, state.settings.orders_enabled); });
    el('menu-tabs')?.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; state.cat = b.dataset.cat; renderMenu(); });
    el('menu-grid')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      cartStore.add(b.dataset.add); toast('Agregado a tu pedido', 'ok', 1800);
    });
  } catch (err) {
    console.error(err);
    for (const id of ['carta', 'promociones', 'experiencias', 'eventos']) el(id).innerHTML = `<div class="wrap">${S.errorBlock('No pudimos cargar el contenido. Revisá tu conexión y recargá la página.')}</div>`;
  }

  // Menú móvil
  const nav = el('main-nav'); const toggle = el('nav-toggle');
  toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });

  // Privacidad
  document.body.insertAdjacentHTML('beforeend', `<dialog id="privacy-dialog" style="width:min(560px,100%)"><div style="padding:24px">${S.PRIVACY_HTML}<button class="btn btn-primary" type="button" id="privacy-close">Cerrar</button></div></dialog>`);
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-privacy]')) { e.preventDefault(); el('privacy-dialog').showModal(); } });
  el('privacy-close').addEventListener('click', () => el('privacy-dialog').close());
}

boot();
console.info(`[The One Experience] modo=${IS_DEMO ? 'demo' : 'producción'} backend=${BACKEND}`);
