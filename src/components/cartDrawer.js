import { esc } from '../utils/html.js';
import { formatMoney } from '../utils/money.js';
import { resolveCart } from '../services/cart.js';
import { cartStore } from '../services/cartStore.js';
import { buildOrderMessage, buildWhatsappUrl, isWhatsappConfigured } from '../services/whatsapp.js';
import { IS_DEMO } from '../config/env.js';
import { toast } from './toast.js';

const signature = (r) => r.lines.map((l) => `${l.productId}:${l.quantity}:${l.status}:${l.unitPriceCents}`).join('|');

/**
 * Carrito en <dialog>. `getCatalog()` devuelve el catálogo VIGENTE (se vuelve a consultar al enviar
 * para no usar precios o disponibilidad viejos).
 */
export function initCart({ dialog, countEl, getState, refreshCatalog }) {
  let shown = '';
  let notice = '';
  let form = { name: '', notes: '' };

  const resolved = () => resolveCart(cartStore.get(), getState().products);

  function updateBadge() {
    const n = resolved().count;
    countEl.textContent = n;
    countEl.hidden = n === 0;
  }

  function render() {
    const { settings } = getState();
    const r = resolved();
    shown = signature(r);
    const waOk = isWhatsappConfigured(settings.whatsapp);
    const canSend = settings.orders_enabled && waOk && r.payable.length > 0 && r.blocked.length === 0;
    dialog.innerHTML = `
      <div class="drawer-head"><h2 id="cart-title">Tu pedido</h2><button class="btn btn-ghost" type="button" data-close aria-label="Cerrar">✕</button></div>
      <div class="drawer-body">
        ${notice ? `<div class="notice warn" role="alert" style="margin-bottom:12px">${esc(notice)}</div>` : ''}
        ${r.lines.length === 0 ? `<div class="state"><strong>Tu pedido está vacío</strong>Agregá productos desde la carta.</div>` : r.lines.map((l) => `
          <div class="line ${l.status === 'ok' ? '' : 'bad'}">
            <div><strong>${esc(l.name)}</strong>
              ${l.status === 'ok' ? `<div class="small">${formatMoney(l.unitPriceCents)} c/u</div>` : `<div class="small" style="color:var(--err)">${l.status === 'unavailable' ? 'Sin disponibilidad: quitalo para continuar' : 'Ya no está en la carta: quitalo para continuar'}</div>`}</div>
            <strong>${l.status === 'ok' ? formatMoney(l.subtotalCents) : '—'}</strong>
            <div class="qty">
              <button type="button" data-dec="${esc(l.productId)}" aria-label="Quitar una unidad de ${esc(l.name)}">−</button>
              <output aria-live="polite">${l.quantity}</output>
              <button type="button" data-inc="${esc(l.productId)}" aria-label="Agregar una unidad de ${esc(l.name)}">+</button>
            </div>
            <button class="btn btn-danger btn-sm" type="button" data-del="${esc(l.productId)}" style="justify-self:end">Eliminar</button>
          </div>`).join('')}
        ${r.lines.length ? `
          <div class="field" style="margin-top:16px"><label for="cart-name">Tu nombre (opcional)</label><input id="cart-name" maxlength="60" value="${esc(form.name)}" autocomplete="given-name"></div>
          <div class="field"><label for="cart-notes">Observaciones (opcional)</label><textarea id="cart-notes" maxlength="300">${esc(form.notes)}</textarea></div>` : ''}
      </div>
      ${r.lines.length ? `<div class="drawer-foot">
        <div class="total-row"><span>Total</span><span>${formatMoney(r.totalCents)}</span></div>
        <p class="small" style="margin:0">Sin costo de envío, impuestos ni descuentos agregados automáticamente. ${esc(settings.orders_note)}</p>
        ${IS_DEMO ? '<p class="notice warn" style="margin:0">MODO DEMO: el mensaje se marca como “pedido de demostración”. Verificá el número configurado antes de enviar.</p>' : ''}
        ${!waOk ? '<p class="notice err" style="margin:0">El WhatsApp del local todavía no está configurado: el envío está desactivado.</p>' : ''}
        ${!settings.orders_enabled ? '<p class="notice err" style="margin:0">Los pedidos están desactivados.</p>' : ''}
        <label class="check"><input type="checkbox" id="cart-confirm"> <span>Entiendo que se abrirá WhatsApp con el mensaje y que el pedido <strong>no queda enviado ni confirmado</strong> hasta que yo lo envíe y el local lo acepte.</span></label>
        <button class="btn btn-primary" type="button" id="cart-send" ${canSend ? '' : 'disabled'}>Revisar y abrir WhatsApp</button>
        <button class="btn btn-outline btn-sm" type="button" data-clear>Vaciar pedido</button>
      </div>` : ''}`;
  }

  function open() { notice = ''; render(); if (!dialog.open) dialog.showModal(); }

  async function send() {
    const confirm = dialog.querySelector('#cart-confirm');
    if (!confirm.checked) { toast('Marcá la casilla para confirmar que entendés cómo funciona.', 'err'); confirm.focus(); return; }
    const btn = dialog.querySelector('#cart-send');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Verificando precios…';
    form = { name: dialog.querySelector('#cart-name').value.trim(), notes: dialog.querySelector('#cart-notes').value.trim() };
    const before = shown; // lo que el cliente estuvo viendo
    try { await refreshCatalog(); } catch { notice = 'No pudimos verificar los precios vigentes. Revisá tu conexión e intentá de nuevo.'; render(); return; }
    const r = resolved();
    if (signature(r) !== before) { notice = 'Actualizamos precios o disponibilidad. Revisá el pedido y confirmá de nuevo.'; render(); updateBadge(); return; }
    if (r.blocked.length || !r.payable.length) { render(); return; }
    const { settings } = getState();
    const msg = buildOrderMessage({ lines: r.payable, totalCents: r.totalCents, customerName: form.name, notes: form.notes, demo: IS_DEMO, businessName: settings.business_name });
    const url = buildWhatsappUrl(settings.whatsapp, msg);
    if (!url) { render(); return; }
    window.open(url, '_blank', 'noopener');
    toast('Se abrió WhatsApp. Recordá enviar el mensaje desde la app.', 'ok', 6000);
    render();
  }

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) return dialog.close();
    const t = e.target.closest('button'); if (!t) return;
    const items = cartStore.get();
    if (t.dataset.inc) cartStore.set(t.dataset.inc, (items[t.dataset.inc] || 0) + 1);
    else if (t.dataset.dec) cartStore.set(t.dataset.dec, (items[t.dataset.dec] || 0) - 1);
    else if (t.dataset.del) cartStore.remove(t.dataset.del);
    else if (t.hasAttribute('data-clear')) cartStore.clear();
    else if (t.id === 'cart-send') return send();
    else return;
    notice = ''; render();
  });
  dialog.addEventListener('input', (e) => {
    if (e.target.id === 'cart-name') form.name = e.target.value;
    if (e.target.id === 'cart-notes') form.notes = e.target.value;
  });

  cartStore.subscribe(updateBadge);
  updateBadge();
  return { open, render: () => { updateBadge(); if (dialog.open) render(); } };
}
