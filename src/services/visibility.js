// Reglas de qué contenido se muestra al público (misma lógica que las políticas RLS).
export function isPromotionActive(p, now = new Date()) {
  if (!p || p.status !== 'published') return false;
  const t = now.getTime();
  if (p.starts_at && new Date(p.starts_at).getTime() > t) return false;
  if (p.ends_at && new Date(p.ends_at).getTime() < t) return false;
  return true;
}

export function promotionState(p, now = new Date()) {
  if (p.status !== 'published') return 'draft';
  const t = now.getTime();
  if (p.starts_at && new Date(p.starts_at).getTime() > t) return 'scheduled';
  if (p.ends_at && new Date(p.ends_at).getTime() < t) return 'expired';
  return 'active';
}

/** Eventos publicados que todavía no terminaron (se asume fin = inicio + 6 h si no hay fin). */
export function isEventUpcoming(e, now = new Date()) {
  if (!e || e.status !== 'published' || !e.starts_at) return false;
  const end = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 6 * 3600e3;
  return end >= now.getTime();
}

export function isProductVisible(p, { showUnavailable = true } = {}) {
  if (!p || p.archived_at || !p.is_published) return false;
  return p.is_available || showUnavailable;
}

export const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name ?? a.title ?? '').localeCompare(String(b.name ?? b.title ?? ''), 'es');
