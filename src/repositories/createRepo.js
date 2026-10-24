// Lógica de datos independiente del backend. Recibe un "store" (local o Supabase).
// El filtrado público aquí es defensa en profundidad: en Supabase, RLS es la barrera real.
import { DEFAULT_SETTINGS } from '../config/defaults.js';
import { isPromotionActive, isEventUpcoming, isProductVisible, bySort } from '../services/visibility.js';
import { validateReservation, validateInquiry } from '../services/validators.js';
import { localDateString } from '../utils/dates.js';

export function createRepo(store, supabase = null) {
  const isLocal = store.kind === 'local';

  async function getSettings() {
    const rows = await store.list('site_settings');
    const out = { ...DEFAULT_SETTINGS };
    for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value;
    return out;
  }

  async function saveSettings(values) {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in DEFAULT_SETTINGS)) continue;
      const row = { key, value, is_public: true };
      await store.upsert('site_settings', isLocal ? { id: key, ...row } : row);
    }
  }

  async function submit(table, rpc, rpcArgs, row) {
    if (isLocal) return store.upsert(table, { ...row, status: 'pending', is_demo: true });
    const { error } = await supabase.rpc(rpc, rpcArgs);
    if (error) throw new Error(error.message.includes('rate_limit') ? 'Recibimos muchas solicitudes. Probá de nuevo en unos minutos.' : 'No pudimos guardar tu solicitud. Intentá de nuevo.');
    return null;
  }

  return {
    mode: store.kind,
    getSettings,
    saveSettings,

    // ---- Público
    async getPublicCatalog() {
      const [settings, categories, products] = await Promise.all([getSettings(), store.list('categories'), store.list('products')]);
      const cats = categories.filter((c) => c.is_active).sort(bySort);
      const activeIds = new Set(cats.map((c) => c.id));
      const prods = products
        .filter((p) => isProductVisible(p, { showUnavailable: settings.show_unavailable_products }) && activeIds.has(p.category_id))
        .sort(bySort);
      return { categories: cats, products: prods, settings };
    },
    async getPublicPromotions() {
      return (await store.list('promotions')).filter((p) => isPromotionActive(p)).sort(bySort);
    },
    async getPublicEvents() {
      return (await store.list('events')).filter((e) => isEventUpcoming(e)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    },
    async getPublicExperiences() {
      return (await store.list('experiences')).filter((x) => x.is_published).sort(bySort);
    },
    async submitReservation(data, { maxParty = 20 } = {}) {
      const errors = validateReservation(data, { maxParty });
      if (Object.keys(errors).length) throw Object.assign(new Error('Datos inválidos'), { errors });
      if (data.website) return null; // honeypot: bots; se descarta en silencio
      const row = {
        name: data.name.trim(), contact: data.contact.trim(), requested_date: data.requested_date,
        requested_time: data.requested_time, party_size: Number(data.party_size),
        reason: (data.reason || '').trim(), comments: (data.comments || '').trim(), consent: true,
      };
      return submit('reservation_requests', 'submit_reservation', {
        p_name: row.name, p_contact: row.contact, p_date: row.requested_date, p_time: row.requested_time,
        p_party_size: row.party_size, p_reason: row.reason, p_comments: row.comments, p_consent: true, p_website: data.website || '',
      }, row);
    },
    async submitInquiry(data) {
      const errors = validateInquiry(data);
      if (Object.keys(errors).length) throw Object.assign(new Error('Datos inválidos'), { errors });
      if (data.website) return null;
      const row = {
        name: data.name.trim(), contact: data.contact.trim(), event_type: data.event_type.trim(),
        estimated_date: data.estimated_date || null, guests: Number(data.guests),
        message: (data.comments || '').trim(), consent: true,
      };
      return submit('private_event_inquiries', 'submit_private_inquiry', {
        p_name: row.name, p_contact: row.contact, p_event_type: row.event_type, p_date: row.estimated_date,
        p_guests: row.guests, p_message: row.message, p_consent: true, p_website: data.website || '',
      }, row);
    },

    // ---- Administración (en Supabase, RLS exige rol admin; esto no es la barrera)
    list: (table) => store.list(table),
    save: (table, row) => store.upsert(table, row),
    remove: (table, id) => store.remove(table, id),
    setStatus: (table, id, status) => store.update(table, id, { status, updated_at: new Date().toISOString() }),
    async dashboard() {
      const [products, promotions, events, reservations, inquiries] = await Promise.all([
        store.list('products'), store.list('promotions'), store.list('events'),
        store.list('reservation_requests'), store.list('private_event_inquiries'),
      ]);
      const live = products.filter((p) => !p.archived_at);
      return {
        activeProducts: live.filter((p) => p.is_published && p.is_available).length,
        unavailableProducts: live.filter((p) => !p.is_available).length,
        publishedPromotions: promotions.filter((p) => isPromotionActive(p)).length,
        upcomingEvents: events.filter((e) => isEventUpcoming(e)).length,
        pendingReservations: reservations.filter((r) => r.status === 'pending').length,
        pendingInquiries: inquiries.filter((r) => r.status === 'pending').length,
        today: localDateString(),
      };
    },
  };
}
