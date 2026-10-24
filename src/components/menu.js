import { esc } from '../utils/html.js';
import { formatMoney } from '../utils/money.js';
import { img, stateBlock, sectionHead } from './sections.js';

const hueOf = (id) => ([...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 360;

export function renderMenuShell(settings) {
  return sectionHead('carta-title', 'Carta', 'Elegí, sumá a tu pedido y enviálo por WhatsApp.')
    + `<div class="menu-tools">
        <div class="field" style="margin:0"><label class="sr-only" for="menu-search">Buscar en la carta</label>
          <input id="menu-search" type="search" placeholder="Buscar en la carta…" autocomplete="off"></div>
        <div class="tabs" id="menu-tabs" role="group" aria-label="Categorías"></div>
      </div><div id="menu-grid" aria-live="polite"></div>
      ${settings.orders_enabled ? '' : '<p class="notice warn">Los pedidos online están desactivados por el momento.</p>'}`;
}

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function renderMenuTabs(categories, active) {
  const tab = (id, label) => `<button class="tab" type="button" data-cat="${esc(id)}" aria-pressed="${active === id}">${esc(label)}</button>`;
  return tab('all', 'Todo') + tab('featured', '★ Destacados') + categories.map((c) => tab(c.id, c.name)).join('');
}

export function renderMenuGrid({ products, categories }, { cat, query }, ordersEnabled) {
  const q = norm(query.trim());
  let list = products;
  if (cat === 'featured') list = list.filter((p) => p.is_featured);
  else if (cat !== 'all') list = list.filter((p) => p.category_id === cat);
  if (q) list = list.filter((p) => norm(`${p.name} ${p.description} ${(p.tags || []).join(' ')}`).includes(q));
  if (!list.length) return stateBlock(q ? 'Sin resultados' : 'Sin productos', q ? 'Probá con otra palabra o categoría.' : 'Esta categoría todavía no tiene productos publicados.');
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return `<div class="grid">${list.map((p) => `
    <article class="card product ${p.is_available ? '' : 'unavailable'}">
      <img loading="lazy" src="${esc(img(p.image_url, p.name, hueOf(p.id)))}" alt="">
      <div class="product-body">
        <div class="tags">
          ${p.is_demo ? '<span class="chip demo">Ejemplo</span>' : ''}
          ${p.is_featured ? '<span class="chip accent">★ Destacado</span>' : ''}
          ${p.is_available ? '' : '<span class="chip err">No disponible</span>'}
          ${(p.tags || []).filter((t) => t !== 'Ejemplo').map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
        </div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description)}</p>
        <div class="product-foot">
          <span class="price" aria-label="Precio">${formatMoney(p.price_cents)}</span>
          <button class="btn btn-primary btn-sm" type="button" data-add="${esc(p.id)}" ${p.is_available && ordersEnabled ? '' : 'disabled'} aria-label="Agregar ${esc(p.name)} al pedido">Agregar</button>
        </div>
        <span class="small">${esc(catName.get(p.category_id) || '')}</span>
      </div>
    </article>`).join('')}</div>`;
}
