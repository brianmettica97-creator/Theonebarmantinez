// DATOS DE EJEMPLO (NOVANTIQ). No representan la carta, precios, eventos ni promociones reales
// de The One Bar Martínez. Todo registro lleva is_demo = true.
const day = 24 * 3600e3;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString();

export function buildDemoSeed() {
  const categories = [
    { id: 'demo-c-food', name: 'Comidas', slug: 'comidas', sort_order: 1, is_active: true, is_demo: true },
    { id: 'demo-c-drinks', name: 'Tragos', slug: 'tragos', sort_order: 2, is_active: true, is_demo: true },
    { id: 'demo-c-soft', name: 'Sin alcohol', slug: 'sin-alcohol', sort_order: 3, is_active: true, is_demo: true },
  ];
  const p = (n, cat, name, description, price, extra = {}) => ({
    id: `demo-p-${n}`, category_id: cat, name, description, price_cents: price * 100, image_url: '',
    is_available: true, is_published: true, is_featured: false, tags: [], sort_order: n, archived_at: null, is_demo: true, ...extra,
  });
  const products = [
    p(1, 'demo-c-food', 'Hamburguesa de ejemplo', 'Producto demostrativo. Reemplazar por la carta real del local.', 9500, { is_featured: true, tags: ['Ejemplo'] }),
    p(2, 'demo-c-food', 'Tabla para compartir (ejemplo)', 'Producto demostrativo para mostrar descripciones largas y precios.', 14800, { tags: ['Ejemplo', 'Para compartir'] }),
    p(3, 'demo-c-food', 'Papas con cheddar (ejemplo)', 'Producto demostrativo.', 6200, { tags: ['Ejemplo'] }),
    p(4, 'demo-c-food', 'Plato agotado (ejemplo)', 'Muestra cómo se ve un producto sin disponibilidad.', 8800, { is_available: false, tags: ['Ejemplo'] }),
    p(5, 'demo-c-drinks', 'Trago de autor (ejemplo)', 'Producto demostrativo. Reemplazar por la coctelería real.', 7400, { is_featured: true, tags: ['Ejemplo'] }),
    p(6, 'demo-c-drinks', 'Clásico de coctelería (ejemplo)', 'Producto demostrativo.', 6800, { tags: ['Ejemplo'] }),
    p(7, 'demo-c-drinks', 'Cerveza tirada (ejemplo)', 'Producto demostrativo.', 5200, { tags: ['Ejemplo'] }),
    p(8, 'demo-c-soft', 'Limonada (ejemplo)', 'Producto demostrativo.', 3900, { tags: ['Ejemplo'] }),
    p(9, 'demo-c-soft', 'Gaseosa (ejemplo)', 'Producto demostrativo.', 2800, { tags: ['Ejemplo'] }),
  ];
  const promotions = [
    { id: 'demo-pr-1', title: 'Promoción de ejemplo (vigente)', description: 'Así se ve una promoción publicada y dentro de sus fechas. No es una oferta real.', image_url: '', starts_at: iso(-3), ends_at: iso(30), status: 'published', conditions: 'Condiciones de ejemplo. Definir con el local.', sort_order: 1, is_demo: true },
    { id: 'demo-pr-2', title: 'Promoción vencida (no se muestra)', description: 'Esta promoción ya venció: no aparece en la web pública, solo en el panel.', image_url: '', starts_at: iso(-30), ends_at: iso(-5), status: 'published', conditions: '', sort_order: 2, is_demo: true },
    { id: 'demo-pr-3', title: 'Borrador de ejemplo', description: 'Un borrador no es visible para el público.', image_url: '', starts_at: null, ends_at: null, status: 'draft', conditions: '', sort_order: 3, is_demo: true },
  ];
  const events = [
    { id: 'demo-e-1', title: 'Evento de ejemplo', description: 'Evento demostrativo para mostrar el diseño. No es un evento confirmado.', image_url: '', starts_at: iso(14), ends_at: null, info: 'Información de ejemplo.', status: 'published', is_demo: true },
  ];
  const experiences = [
    { id: 'demo-x-1', title: 'Experiencia de ejemplo: Pool', description: 'Módulo demostrativo. Confirmar con el local qué experiencias ofrece, tarifas y condiciones antes de publicar.', image_url: '', info: 'Tarifas, horarios y disponibilidad: por confirmar con el local.', faq: [{ q: '¿Cómo se reserva?', a: 'Respuesta de ejemplo: definir con el local.' }], allow_booking: true, is_published: true, sort_order: 1, is_demo: true },
    { id: 'demo-x-2', title: 'Experiencia de ejemplo: Simuladores', description: 'Módulo demostrativo. Confirmar con el local si existe esta actividad antes de publicarla.', image_url: '', info: 'Tarifas, horarios y disponibilidad: por confirmar con el local.', faq: [], allow_booking: true, is_published: true, sort_order: 2, is_demo: true },
  ];
  return { categories, products, promotions, events, experiences, reservation_requests: [], private_event_inquiries: [], site_settings: [] };
}
