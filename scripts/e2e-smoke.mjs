// Prueba E2E con Chromium (Playwright). Uso: npm run dev (otra terminal) y luego npm run test:e2e
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const results = [];
let current = null;
const check = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, String(e.message).split('\n').slice(0, 3).join(' ')]); for (const p of current?.pages() ?? []) await p.keyboard.press('Escape').catch(() => {}); } };
const assert = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch();
const errors = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return { ctx, page };
}

// PNG de prueba (1x1 válido) para subir imágenes
mkdirSync('/tmp/e2e', { recursive: true });
writeFileSync('/tmp/e2e/ok.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
writeFileSync('/tmp/e2e/bad.gif', Buffer.from('R0lGODlhAQABAAAAACw=', 'base64'));

const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } });
current = ctx; ctx.setDefaultTimeout(8000);
await page.goto(BASE + '/');
await page.waitForSelector('.product');

await check('Inicio: portada, banner demo y navegación', async () => {
  assert(await page.locator('#demo-banner').innerText().then((t) => /DEMOSTRACI/.test(t)), 'sin banner demo');
  assert(await page.locator('h1').innerText().then((t) => /martínez/i.test(t)), 'sin título');
  for (const id of ['carta', 'promociones', 'experiencias', 'eventos', 'reservas', 'contacto']) assert(await page.locator('#' + id).count() === 1, id);
});
await check('Carta: categorías, búsqueda y destacados', async () => {
  const total = await page.locator('.product').count(); assert(total === 9, `productos=${total}`);
  await page.click('[data-cat="demo-c-drinks"]'); assert(await page.locator('.product').count() === 3, 'tragos');
  await page.click('[data-cat="featured"]'); assert(await page.locator('.product').count() === 2, 'destacados');
  await page.click('[data-cat="all"]'); await page.fill('#menu-search', 'limonada'); assert(await page.locator('.product').count() === 1, 'búsqueda');
  await page.fill('#menu-search', 'zzzz'); assert(await page.locator('.state').count() >= 1, 'estado vacío');
  await page.fill('#menu-search', '');
});
await check('Producto no disponible: botón deshabilitado', async () => {
  const card = page.locator('.product.unavailable'); assert(await card.count() === 1, 'no hay agotado');
  assert(await card.locator('[data-add]').isDisabled(), 'botón habilitado');
});
await check('Promociones: solo vigentes (vencida y borrador ocultas)', async () => {
  const t = await page.locator('#promociones').innerText();
  assert(/vigente/i.test(t) && !/vencida/i.test(t) && !/Borrador/.test(t), t.slice(0, 200));
});
await check('Contacto: sin datos inventados cuando no están configurados', async () => {
  const t = await page.locator('#contacto').innerText(); assert(/pendientes/i.test(t), t.slice(0, 120));
  assert(await page.locator('#contacto a[href^="tel:"], #contacto a[href*="wa.me"]').count() === 0, 'enlaces de contacto inventados');
});
await check('Carrito: agregar, cantidades, total, eliminar y vacío', async () => {
  await page.click('[data-add="demo-p-1"]'); await page.click('[data-add="demo-p-1"]'); await page.click('[data-add="demo-p-3"]');
  assert(await page.locator('#cart-count').innerText() === '3', 'badge');
  await page.click('#cart-open'); await page.waitForSelector('#cart-dialog[open]');
  let t = await page.locator('#cart-dialog .total-row').innerText(); assert(/25\.200/.test(t), 'total ' + t.replace(/\s+/g, ' ')); // 2×9500 + 6200
  await page.click('[data-inc="demo-p-3"]'); t = await page.locator('#cart-dialog .total-row').innerText(); assert(/31\.400/.test(t), 'total2 ' + t.replace(/\s+/g, ' '));
  await page.click('[data-dec="demo-p-3"]'); await page.click('[data-dec="demo-p-3"]');
  assert(await page.locator('.line').count() === 1, 'línea no eliminada');
  await page.click('[data-del="demo-p-1"]'); assert(/vacío/.test(await page.locator('#cart-dialog').innerText()), 'estado vacío');
  await page.click('[data-close]');
});
await check('WhatsApp: envío desactivado sin número configurado', async () => {
  await page.click('[data-add="demo-p-1"]'); await page.click('#cart-open');
  assert(await page.locator('#cart-send').isDisabled(), 'habilitado sin número');
  assert(/no está configurado/.test(await page.locator('#cart-dialog').innerText()), 'sin aviso');
  await page.click('[data-close]');
});

// ---- Admin
const admin = await ctx.newPage(); admin.on('pageerror', (e) => errors.push(`admin pageerror: ${e.message}`));
await admin.goto(BASE + '/admin/');
await check('Admin: pantalla de acceso protegida (sin contenido de gestión)', async () => {
  assert(await admin.locator('#demo-enter').count() === 1, 'sin login'); assert(await admin.locator('.side').count() === 0, 'panel visible sin sesión');
});
await admin.click('#demo-enter'); await admin.waitForSelector('.stats');
await check('Admin: dashboard con cifras reales', async () => {
  const t = await admin.locator('.stats').innerText(); assert(/Productos activos/.test(t), t);
});
await check('Admin: configurar WhatsApp inválido -> error; válido -> guarda y persiste', async () => {
  await admin.click('a[href="#/settings"]'); await admin.waitForSelector('#settings');
  await admin.fill('#f-whatsapp', '1234'); await admin.click('#settings [type=submit]');
  assert(/inválido/.test(await admin.locator('#e-whatsapp').innerText()), 'sin error');
  await admin.fill('#f-whatsapp', '+54 9 11 5555-0000'); await admin.fill('#f-address', 'Dirección de prueba 123'); await admin.click('#settings [type=submit]');
  await admin.waitForSelector('.toast.ok'); await admin.reload(); await admin.waitForSelector('#settings');
  assert(await admin.inputValue('#f-whatsapp') === '+54 9 11 5555-0000', 'no persistió');
});
await check('Admin: crear producto con imagen, validar archivo inválido', async () => {
  await admin.click('a[href="#/products"]'); await admin.click('#new'); await admin.waitForSelector('dialog.modal[open]');
  await admin.fill('#f-name', 'Producto E2E'); await admin.selectOption('#f-category_id', 'demo-c-food'); await admin.fill('#f-price_cents', '1.250,50');
  await admin.setInputFiles('#f-image_url', '/tmp/e2e/bad.gif'); await admin.waitForSelector('.toast.err');
  await admin.setInputFiles('#f-image_url', '/tmp/e2e/ok.png'); await admin.waitForFunction(() => document.querySelector('input[name=image_url]').value.startsWith('data:image/webp'));
  await admin.click('dialog [type=submit]'); await admin.waitForSelector('td:has-text("Producto E2E")');
});
await check('Admin: precio obligatorio y validación de campos', async () => {
  await admin.click('#new'); await admin.waitForSelector('dialog.modal[open]'); await admin.fill('#f-name', 'X'); await admin.click('dialog [type=submit]');
  assert(/inválido/.test(await admin.locator('#e-price_cents').innerText()), 'precio sin validar'); await admin.click('[data-cancel]');
});
await check('Admin: editar precio y persistir tras recargar', async () => {
  await admin.locator('tr', { hasText: 'Producto E2E' }).locator('[data-edit]').click(); await admin.fill('#f-price_cents', '2000'); await admin.click('dialog [type=submit]');
  await admin.waitForSelector('td:has-text("$ 2.000")'); await admin.reload(); await admin.waitForSelector('td:has-text("Producto E2E")');
  assert(await admin.locator('tr', { hasText: 'Producto E2E' }).innerText().then((t) => /2\.000/.test(t)), 'precio no persistió');
});
await check('Admin: promoción nueva (borrador -> publicada) y fechas inválidas', async () => {
  await admin.click('a[href="#/promotions"]'); await admin.click('#new'); await admin.fill('#f-title', 'Promo E2E');
  await admin.fill('#f-starts_at', '2030-01-02T10:00'); await admin.fill('#f-ends_at', '2030-01-01T10:00'); await admin.click('dialog [type=submit]');
  assert(/posterior/.test(await admin.locator('#e-ends_at').innerText()), 'fechas sin validar');
  await admin.fill('#f-starts_at', ''); await admin.fill('#f-ends_at', ''); await admin.selectOption('#f-status', 'published'); await admin.click('dialog [type=submit]');
  await admin.waitForSelector('td:has-text("Promo E2E")');
});
await check('Admin: evento y solicitudes (estado)', async () => {
  await admin.click('a[href="#/events"]'); await admin.click('#new'); await admin.fill('#f-title', 'Evento E2E');
  const d = new Date(Date.now() + 5 * 864e5); const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T21:00`;
  await admin.fill('#f-starts_at', v); await admin.selectOption('#f-status', 'published'); await admin.click('dialog [type=submit]'); await admin.waitForSelector('td:has-text("Evento E2E")');
});

// ---- Público vuelve a leer lo guardado por el admin
await page.reload(); await page.waitForSelector('.product');
await check('Público refleja cambios del admin (producto, promo, evento, contacto)', async () => {
  assert(await page.locator('.product', { hasText: 'Producto E2E' }).count() === 1, 'producto');
  assert(/Promo E2E/.test(await page.locator('#promociones').innerText()), 'promo');
  assert(/Evento E2E/.test(await page.locator('#eventos').innerText()), 'evento');
  assert(/Dirección de prueba 123/.test(await page.locator('#contacto').innerText()), 'dirección');
});
await check('Pedido por WhatsApp: con número válido abre wa.me con mensaje de demo', async () => {
  await page.click('[data-add="demo-p-1"]'); await page.click('[data-add="demo-p-1"]'); await page.click('#cart-open');
  await page.fill('#cart-name', 'Cliente Prueba'); await page.fill('#cart-notes', 'Sin hielo');
  await page.click('#cart-send'); await page.locator('.toast', { hasText: 'Marcá la casilla' }).waitFor({ state: 'visible' });
  await page.check('#cart-confirm');
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await page.click('#cart-send'); await page.waitForFunction(() => window.__opened.length === 1);
  const url = await page.evaluate(() => window.__opened[0]); assert(url.startsWith('https://wa.me/5491155550000'), url);
  const text = decodeURIComponent(url.split('text=')[1] || '').replace(/\+/g, ' ');
  assert(/DEMOSTRACI/.test(text) && /Cliente Prueba/.test(text) && /Sin hielo/.test(text) && /\d x Hamburguesa/.test(text), text.replace(/\s+/g, ' '));
  await page.click('[data-close]');
});
await check('Cambio de precio: se detecta al enviar y exige reconfirmar', async () => {
  await page.click('#cart-open'); await page.check('#cart-confirm');
  const a = await ctx.newPage(); await a.goto(BASE + '/admin/'); await a.waitForSelector('.stats'); await a.click('a[href="#/products"]');
  await a.locator('tr', { hasText: 'Hamburguesa de ejemplo' }).locator('[data-edit]').click(); await a.fill('#f-price_cents', '10000'); await a.click('dialog [type=submit]'); await a.waitForSelector('.toast.ok'); await a.close();
  await page.evaluate(() => { window.__opened = []; });
  await page.click('#cart-send'); await page.waitForSelector('#cart-dialog .notice.warn[role=alert]');
  assert(/Actualizamos precios/.test(await page.locator('#cart-dialog').innerText()), 'sin aviso'); assert(!(await page.evaluate(() => window.__opened.length)), 'se abrió WhatsApp con precio viejo');
  assert(/30\.000/.test(await page.locator('#cart-dialog .total-row').innerText()), 'total no actualizado'); await page.click('[data-close]');
});
await check('Reservas: validaciones, confirmación pendiente y panel', async () => {
  await page.click('#res-form [type=submit]'); assert(await page.locator('#res-form .field.invalid').count() >= 5, 'faltan errores');
  await page.fill('#res-name', 'Ana Test'); await page.fill('#res-contact', 'ana@test.com');
  await page.fill('#res-date', '2020-01-01'); await page.fill('#res-time', '21:00'); await page.fill('#res-party', '4'); await page.check('#res-consent');
  await page.click('#res-form [type=submit]'); assert(/pasada/.test(await page.locator('#e-res-date, #res-date-err').first().innerText()), 'fecha pasada aceptada');
  const d = new Date(Date.now() + 3 * 864e5); await page.fill('#res-date', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  await page.click('#res-form [type=submit]'); await page.waitForSelector('#form-result .notice.ok');
  assert(/pendiente de confirmación/.test(await page.locator('#form-result').innerText()), 'no dice pendiente');
  await admin.click('a[href="#/requests"]'); await admin.waitForSelector('td:has-text("Ana Test")');
  assert(await admin.locator('tr', { hasText: 'Ana Test' }).locator('select').inputValue() === 'pending', 'estado');
  await admin.locator('tr', { hasText: 'Ana Test' }).locator('select').selectOption('confirmed'); await admin.reload(); await admin.waitForSelector('td:has-text("Ana Test")');
  assert(await admin.locator('tr', { hasText: 'Ana Test' }).locator('select').inputValue() === 'confirmed', 'estado no persistió');
});
await check('Consulta de evento privado se envía', async () => {
  await page.click('[data-form="inq"]'); await page.fill('#inq-name', 'Luis'); await page.fill('#inq-contact', '11 5555 0000'); await page.fill('#inq-type', 'Cumpleaños'); await page.fill('#inq-guests', '30'); await page.check('#inq-consent');
  await page.click('#inq-form [type=submit]'); await page.waitForSelector('#form-result .notice.ok');
});
await check('Eliminar con confirmación (destructivo)', async () => {
  await admin.click('a[href="#/products"]'); await admin.locator('tr', { hasText: 'Producto E2E' }).locator('[data-archive]').click();
  await admin.click('dialog[open] button[value=yes]'); await admin.waitForSelector('tr:has-text("Producto E2E") [data-restore]');
  await admin.locator('tr', { hasText: 'Producto E2E' }).locator('[data-del]').click(); await admin.click('dialog[open] button[value=yes]'); await admin.waitForFunction(() => !document.body.innerText.includes('Producto E2E'));
});
await check('Cierre de sesión devuelve al acceso', async () => { await admin.click('#logout'); await admin.waitForSelector('#demo-enter'); });

// ---- Móvil
const m = await newPage({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });
current = m.ctx; m.ctx.setDefaultTimeout(8000);
await m.page.goto(BASE + '/'); await m.page.waitForSelector('.product');
await check('Móvil 375px: sin scroll horizontal', async () => { const o = await m.page.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert(o <= 1, `overflow ${o}px`); });
await check('Móvil: menú hamburguesa y barra inferior', async () => {
  assert(!(await m.page.locator('#main-nav').isVisible()), 'nav visible'); await m.page.click('#nav-toggle'); assert(await m.page.locator('#main-nav').isVisible(), 'no abre');
  await m.page.click('#main-nav a[href="#reservas"]'); assert(!(await m.page.locator('#main-nav').isVisible()), 'no cierra'); assert(await m.page.locator('.bottom-bar').isVisible(), 'sin barra inferior');
});
await check('Móvil: botones táctiles ≥ 44px', async () => { const h = await m.page.locator('.cart-btn').boundingBox(); assert(h.height >= 44 && h.width >= 44, JSON.stringify(h)); });
await check('Accesibilidad: skip link, lang, labels, imágenes decorativas con alt', async () => {
  assert(await m.page.locator('.skip-link').count() === 1, 'skip'); assert(await m.page.getAttribute('html', 'lang') === 'es-AR', 'lang');
  const noAlt = await m.page.locator('img:not([alt])').count(); assert(noAlt === 0, `imgs sin alt: ${noAlt}`);
  const unl = await m.page.evaluate(() => [...document.querySelectorAll('#reservas input:not([type=hidden]):not([tabindex="-1"])')].filter((i) => !document.querySelector(`label[for="${i.id}"]`) && !i.closest('label')).map((i) => i.id));
  assert(unl.length === 0, 'sin label: ' + unl);
});
await check('Teclado: Tab llega al enlace de salto y a los controles', async () => { await m.page.reload(); await m.page.waitForSelector('.product'); await m.page.keyboard.press('Tab'); assert(await m.page.evaluate(() => document.activeElement.className) === 'skip-link', 'foco inicial'); });
await check('Seguridad: XSS en datos no se ejecuta', async () => {
  await m.page.evaluate(() => localStorage.setItem('novantiq-one:v1:products', JSON.stringify([{ id: 'x', category_id: 'demo-c-food', name: '<img src=x onerror="window.__xss=1">', description: '', price_cents: 100, is_available: true, is_published: true, tags: [], sort_order: 1 }])));
  await m.page.reload(); await m.page.waitForSelector('.product'); await m.page.waitForTimeout(300);
  assert(!(await m.page.evaluate(() => window.__xss)), 'XSS ejecutado');
});
await check('Seguridad: carrito manipulado en localStorage se sanea', async () => {
  await m.page.evaluate(() => localStorage.setItem('novantiq-one:cart:v1', JSON.stringify({ x: -5, y: 'abc', z: 999999 })));
  await m.page.reload(); await m.page.waitForSelector('.product'); assert(await m.page.locator('#cart-count').innerText() === '0' || (await m.page.locator('#cart-count').isHidden()), 'badge');
});
await browser.close();

const fails = results.filter((r) => r[0] === 'FAIL');
for (const r of results) console.log(r[0].padEnd(5), r[1], r[2] ? `→ ${r[2]}` : '');
const relevant = errors.filter((e) => !/favicon/.test(e));
console.log(`\n${results.length - fails.length}/${results.length} OK · errores de consola/JS: ${relevant.length}`);
relevant.slice(0, 8).forEach((e) => console.log('  ', e));
process.exit(fails.length || relevant.length ? 1 : 0);
