// Lógica pura del carrito. Solo se persiste {productId: cantidad}: los precios SIEMPRE se
// resuelven contra el catálogo vigente, así un cambio de precio nunca usa valores viejos.
export const MAX_QTY_PER_LINE = 50;

export function addItem(items, productId, qty = 1) {
  const next = { ...items };
  next[productId] = Math.min(MAX_QTY_PER_LINE, (next[productId] || 0) + qty);
  return next;
}

export function setQuantity(items, productId, qty) {
  const q = Math.trunc(Number(qty));
  const next = { ...items };
  if (!Number.isFinite(q) || q <= 0) delete next[productId];
  else next[productId] = Math.min(MAX_QTY_PER_LINE, q);
  return next;
}

export function removeItem(items, productId) {
  const next = { ...items };
  delete next[productId];
  return next;
}

/** Limpia datos corruptos (p. ej. localStorage manipulado). */
export function sanitizeItems(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, q] of Object.entries(raw)) {
    const n = Math.trunc(Number(q));
    if (typeof id === 'string' && id.length <= 64 && n > 0) out[id] = Math.min(n, MAX_QTY_PER_LINE);
  }
  return out;
}

/**
 * Resuelve el carrito contra el catálogo. Estados por línea:
 *  ok | unavailable (sin stock/desactivado) | missing (ya no existe).
 * Solo las líneas "ok" suman al total. Sin envío, impuestos ni descuentos automáticos.
 */
export function resolveCart(items, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = [];
  let totalCents = 0;
  for (const [productId, quantity] of Object.entries(items)) {
    const p = byId.get(productId);
    if (!p || p.archived_at || !p.is_published) {
      lines.push({ productId, quantity, name: 'Producto ya no disponible', status: 'missing', unitPriceCents: 0, subtotalCents: 0 });
      continue;
    }
    const ok = p.is_available;
    const subtotalCents = ok ? p.price_cents * quantity : 0;
    if (ok) totalCents += subtotalCents;
    lines.push({
      productId, quantity, name: p.name, image_url: p.image_url,
      status: ok ? 'ok' : 'unavailable', unitPriceCents: p.price_cents, subtotalCents,
    });
  }
  const payable = lines.filter((l) => l.status === 'ok');
  const blocked = lines.filter((l) => l.status !== 'ok');
  return { lines, payable, blocked, totalCents, count: payable.reduce((a, l) => a + l.quantity, 0) };
}
