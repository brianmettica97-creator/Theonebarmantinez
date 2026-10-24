import { describe, it, expect } from 'vitest';
import { formatMoney, parsePesosToCents, centsToInput } from '../src/utils/money.js';
import { addItem, setQuantity, removeItem, resolveCart, sanitizeItems } from '../src/services/cart.js';
import { normalizeWhatsapp, buildOrderMessage, buildWhatsappUrl } from '../src/services/whatsapp.js';
import { validateReservation, validateInquiry, validateImageFile, isValidContact } from '../src/services/validators.js';
import { isPromotionActive, isEventUpcoming, isProductVisible } from '../src/services/visibility.js';
import { addDays, localDateString } from '../src/utils/dates.js';
import { esc, safeUrl } from '../src/utils/html.js';
import { createRepo } from '../src/repositories/createRepo.js';
import { buildDemoSeed } from '../src/data/demoSeed.js';

const P = (id, price, extra = {}) => ({ id, name: `P${id}`, price_cents: price, is_available: true, is_published: true, archived_at: null, ...extra });

describe('dinero', () => {
  it('parsea pesos a centavos sin errores de float', () => {
    expect(parsePesosToCents('9500')).toBe(950000);
    expect(parsePesosToCents('9.500,50')).toBe(950050);
    expect(parsePesosToCents('0.1')).toBe(10);
    expect(parsePesosToCents('19.99')).toBe(1999);
    expect(parsePesosToCents('1.250.000')).toBe(125000000);
  });
  it('rechaza inválidos y negativos', () => {
    for (const v of ['', 'abc', '-5', '1,234', null]) expect(parsePesosToCents(v)).toBeNull();
  });
  it('formatea en es-AR', () => {
    expect(formatMoney(950050)).toMatch(/9\.500,50/);
    expect(formatMoney(950000)).toMatch(/9\.500$/);
    expect(formatMoney(1.5)).toBe('—');
    expect(centsToInput(950050)).toBe('9500,50');
  });
});

describe('carrito', () => {
  const products = [P('a', 1000), P('b', 2550), P('c', 500, { is_available: false })];
  it('agrega, modifica y elimina', () => {
    let it = addItem({}, 'a'); it = addItem(it, 'a'); it = addItem(it, 'b');
    expect(it).toEqual({ a: 2, b: 1 });
    it = setQuantity(it, 'a', 5); expect(it.a).toBe(5);
    it = setQuantity(it, 'a', 0); expect(it.a).toBeUndefined();
    expect(removeItem(it, 'b')).toEqual({});
  });
  it('subtotales y total', () => {
    const r = resolveCart({ a: 3, b: 2 }, products);
    expect(r.lines.map((l) => l.subtotalCents)).toEqual([3000, 5100]);
    expect(r.totalCents).toBe(8100);
    expect(r.count).toBe(5);
  });
  it('carrito vacío', () => expect(resolveCart({}, products)).toMatchObject({ totalCents: 0, count: 0, lines: [] }));
  it('producto no disponible no suma y bloquea', () => {
    const r = resolveCart({ a: 1, c: 2 }, products);
    expect(r.totalCents).toBe(1000); expect(r.blocked).toHaveLength(1); expect(r.blocked[0].status).toBe('unavailable');
  });
  it('producto inexistente/archivado/no publicado -> missing', () => {
    const r = resolveCart({ x: 1, z: 1 }, [P('z', 1, { archived_at: 'x' })]);
    expect(r.lines.every((l) => l.status === 'missing')).toBe(true);
  });
  it('cambio de precio: usa SIEMPRE el precio vigente', () => {
    const items = { a: 2 };
    expect(resolveCart(items, [P('a', 1000)]).totalCents).toBe(2000);
    expect(resolveCart(items, [P('a', 1500)]).totalCents).toBe(3000);
  });
  it('datos inválidos/manipulados se limpian', () => {
    expect(sanitizeItems({ a: -3, b: 'x', c: 2.9, d: 9999, [`${'x'.repeat(70)}`]: 1 })).toEqual({ c: 2, d: 50 });
    expect(sanitizeItems('hack')).toEqual({});
  });
});

describe('whatsapp', () => {
  it('normaliza formatos', () => {
    expect(normalizeWhatsapp('+54 9 11 1234-5678')).toBe('5491112345678');
    expect(normalizeWhatsapp('5491112345678')).toBe('5491112345678');
  });
  it('rechaza vacío, sin código de país, letras', () => {
    for (const v of ['', '11 1234 5678', '+54 abc', '123', null, undefined]) expect(normalizeWhatsapp(v)).toBeNull();
    expect(buildWhatsappUrl('', 'hola')).toBeNull();
  });
  it('mensaje ordenado con totales, observaciones y marca demo', () => {
    const msg = buildOrderMessage({ lines: [{ quantity: 2, name: 'Burger', unitPriceCents: 950000, subtotalCents: 1900000 }], totalCents: 1900000, customerName: 'Ana', notes: 'Sin cebolla', demo: true, businessName: 'The One' });
    expect(msg).toContain('DEMOSTRACIÓN'); expect(msg).toContain('2 x Burger'); expect(msg).toMatch(/Total: .*19\.000/); expect(msg).toContain('Nombre: Ana'); expect(msg).toContain('Sin cebolla');
    const url = buildWhatsappUrl('+54 9 11 1234-5678', msg);
    expect(url.startsWith('https://wa.me/5491112345678?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe(msg);
  });
});

describe('validación de formularios', () => {
  const today = '2026-06-10';
  const ok = { name: 'Ana Pérez', contact: '+54 9 11 5555-0000', requested_date: '2026-06-12', requested_time: '21:30', party_size: 4, consent: true };
  it('reserva válida', () => expect(validateReservation(ok, { today })).toEqual({}));
  it('campos obligatorios', () => expect(Object.keys(validateReservation({}, { today })).sort()).toEqual(['consent', 'contact', 'name', 'party_size', 'requested_date', 'requested_time']));
  it('fecha pasada, inexistente y lejana', () => {
    expect(validateReservation({ ...ok, requested_date: '2026-06-09' }, { today }).requested_date).toBeTruthy();
    expect(validateReservation({ ...ok, requested_date: '2026-02-30' }, { today }).requested_date).toBeTruthy();
    expect(validateReservation({ ...ok, requested_date: '2028-01-01' }, { today }).requested_date).toBeTruthy();
    expect(validateReservation({ ...ok, requested_date: today }, { today })).toEqual({});
  });
  it('cantidad de personas', () => {
    for (const n of [0, -1, 1.5, 'x', 21]) expect(validateReservation({ ...ok, party_size: n }, { today, maxParty: 20 }).party_size).toBeTruthy();
  });
  it('contacto', () => { expect(isValidContact('a@b.co')).toBe(true); expect(isValidContact('11 5555 0000')).toBe(true); expect(isValidContact('hola')).toBe(false); });
  it('consulta de evento', () => {
    const q = { name: 'Luis', contact: 'luis@mail.com', event_type: 'Cumpleaños', guests: 30, consent: true };
    expect(validateInquiry(q, { today })).toEqual({});
    expect(validateInquiry({ ...q, guests: 0 }, { today }).guests).toBeTruthy();
    expect(validateInquiry({ ...q, estimated_date: '2020-01-01' }, { today }).estimated_date).toBeTruthy();
  });
  it('archivos de imagen', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1 }, 5)).toBeTruthy();
    expect(validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024 }, 5)).toBeTruthy();
    expect(validateImageFile({ type: 'image/webp', size: 1000 }, 5)).toBeNull();
  });
});

describe('visibilidad', () => {
  const now = new Date('2026-06-10T12:00:00Z');
  it('promociones: vencida, futura, borrador', () => {
    expect(isPromotionActive({ status: 'published', starts_at: '2026-06-01T00:00:00Z', ends_at: '2026-06-30T00:00:00Z' }, now)).toBe(true);
    expect(isPromotionActive({ status: 'published', ends_at: '2026-06-09T00:00:00Z' }, now)).toBe(false);
    expect(isPromotionActive({ status: 'published', starts_at: '2026-06-11T00:00:00Z' }, now)).toBe(false);
    expect(isPromotionActive({ status: 'draft' }, now)).toBe(false);
  });
  it('eventos pasados o borrador no se muestran', () => {
    expect(isEventUpcoming({ status: 'published', starts_at: '2026-06-20T00:00:00Z' }, now)).toBe(true);
    expect(isEventUpcoming({ status: 'published', starts_at: '2026-06-01T00:00:00Z' }, now)).toBe(false);
    expect(isEventUpcoming({ status: 'draft', starts_at: '2026-06-20T00:00:00Z' }, now)).toBe(false);
  });
  it('productos según configuración de no disponibles', () => {
    const p = P('a', 1, { is_available: false });
    expect(isProductVisible(p, { showUnavailable: true })).toBe(true);
    expect(isProductVisible(p, { showUnavailable: false })).toBe(false);
    expect(isProductVisible(P('b', 1, { archived_at: 'x' }))).toBe(false);
  });
});

describe('seguridad XSS', () => {
  it('escapa HTML y filtra URLs peligrosas', () => {
    expect(esc('<img src=x onerror=alert(1)>"\'')).not.toMatch(/[<>"']/);
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('data:text/html;base64,AAA')).toBe('');
    expect(safeUrl('https://x.com/a.jpg')).toBe('https://x.com/a.jpg');
  });
});

describe('repositorio (store en memoria)', () => {
  const memStore = () => {
    const seed = buildDemoSeed(); let n = 0;
    return { kind: 'local',
      list: async (t) => structuredClone(seed[t] ?? []),
      upsert: async (t, r) => { const row = { id: `n${n++}`, ...r }; (seed[t] ||= []).push(row); return row; },
      update: async (t, id, p) => Object.assign(seed[t].find((r) => r.id === id), p), remove: async () => {} };
  };
  it('catálogo público: oculta vencidas/borradores, mantiene datos demo marcados', async () => {
    const repo = createRepo(memStore());
    const promos = await repo.getPublicPromotions();
    expect(promos.map((p) => p.id)).toEqual(['demo-pr-1']);
    const { products } = await repo.getPublicCatalog();
    expect(products.every((p) => p.is_demo)).toBe(true);
    expect(products.some((p) => !p.is_available)).toBe(true);
  });
  it('configuración por defecto sin datos de contacto inventados', async () => {
    const s = await createRepo(memStore()).getSettings();
    expect(s.whatsapp).toBe(''); expect(s.address).toBe(''); expect(s.phone).toBe('');
  });
  it('reserva: valida, guarda como pendiente y descarta honeypot', async () => {
    const store = memStore(); const repo = createRepo(store);
    const d = { name: 'Ana', contact: 'ana@mail.com', requested_date: addDays(localDateString(), 5), requested_time: '20:00', party_size: 2, consent: true };
    const saved = await repo.submitReservation(d);
    expect(saved.status).toBe('pending'); expect(saved.is_demo).toBe(true);
    await expect(repo.submitReservation({ ...d, party_size: 0 })).rejects.toMatchObject({ errors: { party_size: expect.any(String) } });
    expect(await repo.submitReservation({ ...d, website: 'spam' })).toBeNull();
    expect((await store.list('reservation_requests'))).toHaveLength(1);
  });
});
