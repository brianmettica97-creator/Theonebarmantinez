// Definición declarativa de las entidades administrables (campos, validación y columnas).
import { formatMoney } from '../../utils/money.js';
import { formatDateTime } from '../../utils/dates.js';
import { promotionState, isEventUpcoming } from '../../services/visibility.js';
import { esc } from '../../utils/html.js';
import { placeholderImage } from '../../utils/placeholder.js';

const chip = (t, cls = '') => `<span class="chip ${cls}">${esc(t)}</span>`;
const thumb = (r) => `<img class="thumb" src="${esc(r.image_url || placeholderImage('Sin imagen'))}" alt="">`;
const STATUS = [{ value: 'draft', label: 'Borrador' }, { value: 'published', label: 'Publicado' }];

export const ENTITIES = {
  products: {
    title: 'Productos', singular: 'producto', table: 'products', needs: ['categories'], archive: true, imageFolder: 'products',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, max: 100, full: true },
      { key: 'category_id', label: 'Categoría', type: 'select', required: true, options: (ctx) => ctx.categories.map((c) => ({ value: c.id, label: c.name })) },
      { key: 'price_cents', label: 'Precio (ARS)', type: 'money', required: true, hint: 'Ej: 9500 o 9.500,50' },
      { key: 'description', label: 'Descripción', type: 'textarea', max: 600, full: true },
      { key: 'image_url', label: 'Foto', type: 'image', full: true },
      { key: 'tags', label: 'Etiquetas (separadas por coma)', type: 'tags', full: true },
      { key: 'is_available', label: 'Disponible hoy', type: 'checkbox', default: true },
      { key: 'is_published', label: 'Publicado en la carta', type: 'checkbox', default: true },
      { key: 'is_featured', label: 'Destacado', type: 'checkbox' },
      { key: 'sort_order', label: 'Orden', type: 'number', default: 0 },
    ],
    defaults: { is_demo: false, archived_at: null },
    columns: (r, ctx) => [thumb(r), `<strong>${esc(r.name)}</strong>${r.is_demo ? ' ' + chip('Ejemplo', 'demo') : ''}<br><span class="small">${esc(ctx.categories.find((c) => c.id === r.category_id)?.name || '—')}</span>`, formatMoney(r.price_cents),
      [r.archived_at ? chip('Archivado') : r.is_published ? chip('Publicado', 'ok') : chip('Borrador'), r.is_available ? '' : chip('No disponible', 'err'), r.is_featured ? chip('★', 'accent') : ''].join(' ')],
    heads: ['', 'Producto', 'Precio', 'Estado'],
  },
  categories: {
    title: 'Categorías', singular: 'categoría', table: 'categories', needs: [],
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, max: 60, full: true },
      { key: 'sort_order', label: 'Orden', type: 'number', default: 0 },
      { key: 'is_active', label: 'Visible en la carta', type: 'checkbox', default: true },
    ],
    defaults: { is_demo: false },
    columns: (r) => [`<strong>${esc(r.name)}</strong>`, r.sort_order, r.is_active ? chip('Visible', 'ok') : chip('Oculta')],
    heads: ['Nombre', 'Orden', 'Estado'],
  },
  promotions: {
    title: 'Promociones', singular: 'promoción', table: 'promotions', needs: [], imageFolder: 'promotions',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true, max: 120, full: true },
      { key: 'description', label: 'Descripción', type: 'textarea', max: 800, full: true },
      { key: 'image_url', label: 'Imagen', type: 'image', full: true },
      { key: 'starts_at', label: 'Inicio', type: 'datetime' },
      { key: 'ends_at', label: 'Fin', type: 'datetime' },
      { key: 'status', label: 'Estado', type: 'select', options: () => STATUS, default: 'draft' },
      { key: 'sort_order', label: 'Orden', type: 'number', default: 0 },
      { key: 'conditions', label: 'Condiciones', type: 'textarea', max: 800, full: true },
    ],
    validate: (d) => (d.starts_at && d.ends_at && d.ends_at < d.starts_at ? { ends_at: 'El fin debe ser posterior al inicio.' } : {}),
    defaults: { is_demo: false },
    columns: (r) => {
      const st = promotionState(r);
      const label = { active: chip('Vigente', 'ok'), scheduled: chip('Programada'), expired: chip('Vencida', 'err'), draft: chip('Borrador') }[st];
      return [thumb(r), `<strong>${esc(r.title)}</strong>${r.is_demo ? ' ' + chip('Ejemplo', 'demo') : ''}`, `${r.starts_at ? formatDateTime(r.starts_at) : 'Sin inicio'}<br>${r.ends_at ? formatDateTime(r.ends_at) : 'Sin fin'}`, label];
    },
    heads: ['', 'Promoción', 'Fechas', 'Estado'],
  },
  events: {
    title: 'Eventos', singular: 'evento', table: 'events', needs: [], imageFolder: 'events',
    fields: [
      { key: 'title', label: 'Nombre', type: 'text', required: true, max: 120, full: true },
      { key: 'description', label: 'Descripción', type: 'textarea', max: 800, full: true },
      { key: 'image_url', label: 'Imagen', type: 'image', full: true },
      { key: 'starts_at', label: 'Fecha y hora de inicio', type: 'datetime', required: true },
      { key: 'ends_at', label: 'Fin (opcional)', type: 'datetime' },
      { key: 'status', label: 'Estado', type: 'select', options: () => STATUS, default: 'draft' },
      { key: 'info', label: 'Información relevante', type: 'textarea', max: 600, full: true },
    ],
    validate: (d) => (d.starts_at && d.ends_at && d.ends_at < d.starts_at ? { ends_at: 'El fin debe ser posterior al inicio.' } : {}),
    defaults: { is_demo: false },
    columns: (r) => [thumb(r), `<strong>${esc(r.title)}</strong>${r.is_demo ? ' ' + chip('Ejemplo', 'demo') : ''}`, formatDateTime(r.starts_at),
      r.status !== 'published' ? chip('Borrador') : isEventUpcoming(r) ? chip('Publicado', 'ok') : chip('Finalizado')],
    heads: ['', 'Evento', 'Fecha', 'Estado'],
  },
  experiences: {
    title: 'Experiencias', singular: 'experiencia', table: 'experiences', needs: [], imageFolder: 'experiences',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true, max: 100, full: true },
      { key: 'description', label: 'Descripción', type: 'textarea', max: 800, full: true },
      { key: 'image_url', label: 'Imagen', type: 'image', full: true },
      { key: 'info', label: 'Información útil (tarifas, horarios, condiciones)', type: 'textarea', max: 600, full: true },
      { key: 'faq', label: 'Preguntas frecuentes (una por línea: Pregunta | Respuesta)', type: 'faq', full: true },
      { key: 'allow_booking', label: 'Mostrar botón de consulta/reserva', type: 'checkbox' },
      { key: 'is_published', label: 'Publicada', type: 'checkbox' },
      { key: 'sort_order', label: 'Orden', type: 'number', default: 0 },
    ],
    defaults: { is_demo: false },
    columns: (r) => [thumb(r), `<strong>${esc(r.title)}</strong>${r.is_demo ? ' ' + chip('Ejemplo', 'demo') : ''}`, r.is_published ? chip('Publicada', 'ok') : chip('Borrador')],
    heads: ['', 'Experiencia', 'Estado'],
  },
};

export const SETTINGS_GROUPS = [
  { title: 'Marca', fields: [
    { key: 'business_name', label: 'Nombre comercial', type: 'text', required: true, max: 80 },
    { key: 'tagline', label: 'Frase de portada', type: 'text', max: 120 },
    { key: 'logo_url', label: 'Logo', type: 'image', folder: 'brand' },
    { key: 'hero_image_url', label: 'Imagen de portada', type: 'image', folder: 'brand' },
    { key: 'accent_color', label: 'Color de acento', type: 'color' },
  ] },
  { title: 'Contacto', fields: [
    { key: 'whatsapp', label: 'WhatsApp (formato internacional)', type: 'text', hint: 'Ej: +54 9 11 XXXX-XXXX. Sin número válido, el envío de pedidos queda desactivado.', kind: 'whatsapp' },
    { key: 'phone', label: 'Teléfono', type: 'text', max: 40 },
    { key: 'address', label: 'Dirección', type: 'textarea', max: 200 },
    { key: 'hours', label: 'Horarios', type: 'textarea', max: 400 },
    { key: 'instagram', label: 'Instagram (usuario o URL)', type: 'text', max: 120 },
    { key: 'facebook', label: 'Facebook (usuario o URL)', type: 'text', max: 120 },
    { key: 'map_embed_url', label: 'URL de mapa para incrustar (Google Maps/OpenStreetMap)', type: 'text', max: 600 },
    { key: 'faq', label: 'Preguntas frecuentes (Pregunta | Respuesta)', type: 'faq' },
  ] },
  { title: 'Pedidos', fields: [
    { key: 'orders_enabled', label: 'Habilitar pedidos por WhatsApp', type: 'checkbox' },
    { key: 'show_unavailable_products', label: 'Mostrar productos no disponibles (deshabilitados)', type: 'checkbox' },
    { key: 'orders_note', label: 'Aviso en el pedido', type: 'textarea', max: 300 },
  ] },
  { title: 'Reservas y eventos privados', fields: [
    { key: 'reservations_enabled', label: 'Habilitar solicitudes de reserva', type: 'checkbox' },
    { key: 'reservations_max_party', label: 'Máximo de personas por reserva', type: 'number', min: 1, max: 200 },
    { key: 'reservations_note', label: 'Aviso en reservas', type: 'textarea', max: 300 },
    { key: 'private_events_enabled', label: 'Habilitar consultas de cumpleaños y eventos privados (solo si el local ofrece el servicio)', type: 'checkbox' },
  ] },
];
