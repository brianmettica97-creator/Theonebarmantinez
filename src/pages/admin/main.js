import '../../styles/base.css';
import '../../styles/admin.css';
import { repo, localStore } from '../../repositories/index.js';
import { auth } from '../../repositories/auth.js';
import { CONFIG_ERROR, IS_DEMO, APP_MODE, BACKEND, MAX_IMAGE_MB } from '../../config/env.js';
import { esc, slugify } from '../../utils/html.js';
import { formatDateTime } from '../../utils/dates.js';
import { toast } from '../../components/toast.js';
import { uploadImage, deleteImageByUrl } from '../../services/images.js';
import { ENTITIES, SETTINGS_GROUPS } from './schemas.js';
import { renderField, collectForm, showFieldErrors } from './fields.js';

const app = document.getElementById('app');
let session = null;
const NAV = [['dashboard', 'Resumen', '📊'], ['products', 'Productos', '🍽️'], ['categories', 'Categorías', '🗂️'], ['promotions', 'Promociones', '🏷️'], ['events', 'Eventos', '🎉'], ['experiences', 'Experiencias', '🎯'], ['requests', 'Solicitudes', '📥'], ['settings', 'Ajustes', '⚙️']];
const isAdmin = () => session?.role === 'admin';
const navFor = () => NAV.filter(([k]) => k !== 'settings' || isAdmin());
const errMsg = (e) => esc(e?.message || 'Error inesperado');

// ---------- Acceso ----------
function loginView(msg = '', recovery = false) {
  const local = BACKEND === 'local';
  app.innerHTML = `<div class="login"><div class="card"><h1 style="font-size:1.8rem">Panel de gestión</h1>
    ${IS_DEMO ? '<p class="notice warn">MODO DEMO · Los cambios se guardan solo en este navegador. No hay credenciales: el acceso es de demostración.</p>' : ''}
    ${msg ? `<p class="notice err" role="alert">${esc(msg)}</p>` : ''}
    ${recovery ? `<form id="newpass" novalidate><div class="field"><label for="np">Nueva contraseña (mínimo 10 caracteres)</label><input id="np" type="password" minlength="10" autocomplete="new-password" required></div><button class="btn btn-primary" type="submit">Guardar contraseña</button></form>`
    : local ? `<button class="btn btn-primary" id="demo-enter" type="button">Entrar al panel de demostración</button>`
    : `<form id="login" novalidate><div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required></div>
        <div class="field"><label for="pw">Contraseña</label><input id="pw" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary" type="submit" style="width:100%">Ingresar</button>
        <p style="margin:14px 0 0"><a href="#" id="forgot">Olvidé mi contraseña</a></p></form>`}
    <p class="small" style="margin-top:16px"><a href="../">← Volver a la web</a></p></div></div>`;
  document.getElementById('demo-enter')?.addEventListener('click', async () => { session = await auth.signIn(); start(); });
  document.getElementById('login')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true;
    try { session = await auth.signIn(e.target.em.value.trim(), e.target.pw.value); if (!session || session.denied) { await auth.signOut(); session = null; return loginView('Tu usuario no tiene permisos de administración.'); } start(); }
    catch (err) { loginView(err.message); }
  });
  document.getElementById('forgot')?.addEventListener('click', async (e) => {
    e.preventDefault(); const em = document.getElementById('em').value.trim();
    if (!em) return toast('Ingresá tu email arriba y volvé a tocar el enlace.', 'err');
    try { await auth.requestPasswordReset(em); toast('Si el email existe, enviamos un enlace para restablecer la contraseña.', 'ok', 7000); } catch (err) { toast(err.message, 'err'); }
  });
  document.getElementById('newpass')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const p = document.getElementById('np').value;
    if (p.length < 10) return toast('La contraseña debe tener al menos 10 caracteres.', 'err');
    try { await auth.updatePassword(p); toast('Contraseña actualizada.', 'ok'); history.replaceState(null, '', location.pathname); start(); } catch (err) { toast(err.message, 'err'); }
  });
}

// ---------- Layout ----------
function shell(route) {
  app.innerHTML = `<div class="topbar"><button class="btn btn-ghost" id="menu-btn" aria-label="Menú" aria-expanded="false">☰</button><strong>Panel</strong></div>
  <div class="shell"><aside class="side" id="side" aria-label="Administración"><div class="brand">The One · Panel</div>
    ${navFor().map(([k, l, i]) => `<a href="#/${k}" ${k === route ? 'aria-current="page"' : ''}><span aria-hidden="true">${i}</span>${l}</a>`).join('')}
    <div class="spacer"></div><a href="../" target="_blank" rel="noopener">🌐 Ver web</a>
    <button class="btn btn-outline btn-sm" id="logout" type="button">Cerrar sesión</button></aside>
  <main class="content" id="admin-main" tabindex="-1">${IS_DEMO ? '<p class="notice warn">DEMO · Datos guardados solo en este navegador.</p>' : ''}<div id="view"></div></main></div>`;
  document.getElementById('logout').addEventListener('click', async () => { await auth.signOut(); session = null; loginView(); });
  const side = document.getElementById('side'); const mb = document.getElementById('menu-btn');
  mb.addEventListener('click', () => { const o = side.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); });
  side.addEventListener('click', (e) => { if (e.target.closest('a')) side.classList.remove('open'); });
  return document.getElementById('view');
}

const confirmDialog = (text) => new Promise((res) => {
  const d = document.createElement('dialog'); d.className = 'modal'; d.style.maxWidth = '420px';
  d.innerHTML = `<div style="padding:22px"><p>${esc(text)}</p><div class="modal-actions" style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-outline" value="no">Cancelar</button><button class="btn btn-danger" value="yes">Confirmar</button></div></div>`;
  d.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { d.close(); res(b.value === 'yes'); } });
  d.addEventListener('cancel', () => res(false)); document.body.append(d); d.showModal(); d.addEventListener('close', () => d.remove());
});

// ---------- Vistas ----------
async function dashboardView(view) {
  view.innerHTML = '<h1>Resumen</h1><div class="skeleton"></div>';
  const d = await repo.dashboard();
  const stat = (n, l) => `<div class="card stat"><b>${n}</b><span>${l}</span></div>`;
  view.innerHTML = `<h1>Resumen</h1><div class="stats">${stat(d.activeProducts, 'Productos activos')}${stat(d.unavailableProducts, 'Productos no disponibles')}${stat(d.publishedPromotions, 'Promociones vigentes')}${stat(d.upcomingEvents, 'Próximos eventos')}${stat(d.pendingReservations, 'Reservas pendientes')}${stat(d.pendingInquiries, 'Consultas de eventos pendientes')}</div>
    <p class="small">Cifras calculadas en vivo desde los datos guardados. Los pedidos por WhatsApp no se registran en esta versión (se abren en la app de WhatsApp del cliente), por eso no hay estadísticas de pedidos.</p>`;
}

async function entityView(view, key) {
  const E = ENTITIES[key];
  const ctx = {}; for (const n of E.needs) ctx[n] = await repo.list(n);
  ctx.folder = E.imageFolder;
  const rows = (await repo.list(E.table)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name ?? a.title).localeCompare(String(b.name ?? b.title), 'es') || 0);
  const draw = () => {
    view.innerHTML = `<h1>${E.title}</h1><div class="toolbar"><span class="small">${rows.length} registros</span><button class="btn btn-primary" id="new">+ Nuevo ${E.singular}</button></div>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr>${E.heads.map((h) => `<th scope="col">${h}</th>`).join('')}<th scope="col">Acciones</th></tr></thead><tbody>${rows.map((r) => `<tr>${E.columns(r, ctx).map((c) => `<td>${c}</td>`).join('')}<td><div class="actions">
      <button class="btn btn-outline btn-sm" data-edit="${esc(r.id)}">Editar</button>
      ${E.archive && !r.archived_at ? `<button class="btn btn-outline btn-sm" data-archive="${esc(r.id)}">Archivar</button>` : ''}
      ${E.archive && r.archived_at ? `<button class="btn btn-outline btn-sm" data-restore="${esc(r.id)}">Restaurar</button>` : ''}
      ${!E.archive || r.archived_at ? `<button class="btn btn-danger btn-sm" data-del="${esc(r.id)}">Eliminar</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="state"><strong>Sin ${E.title.toLowerCase()}</strong>Creá el primero con el botón de arriba.</div>`}`;
  };
  draw();
  const save = async (row) => { const saved = await repo.save(E.table, row); const i = rows.findIndex((r) => r.id === saved.id); if (i >= 0) rows[i] = saved; else rows.push(saved); draw(); };
  view.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const find = (id) => rows.find((r) => r.id === id);
    try {
      if (b.id === 'new') openForm(E, null, ctx, async (d) => save({ ...E.defaults, ...d, ...(key === 'categories' ? { slug: uniqueSlug(d.name, rows) } : {}) }));
      else if (b.dataset.edit) { const r = find(b.dataset.edit); openForm(E, r, ctx, async (d) => { if (r.image_url && d.image_url !== r.image_url) deleteImageByUrl(r.image_url).catch(() => {}); await save({ ...r, ...d }); }); }
      else if (b.dataset.archive) { if (await confirmDialog('¿Archivar este producto? Dejará de mostrarse en la carta.')) { await save({ ...find(b.dataset.archive), archived_at: new Date().toISOString() }); toast('Archivado', 'ok'); } }
      else if (b.dataset.restore) { await save({ ...find(b.dataset.restore), archived_at: null }); toast('Restaurado', 'ok'); }
      else if (b.dataset.del) { const r = find(b.dataset.del); if (await confirmDialog(`¿Eliminar definitivamente "${r.name ?? r.title}"? Esta acción no se puede deshacer.`)) { await repo.remove(E.table, r.id); if (r.image_url) deleteImageByUrl(r.image_url).catch(() => {}); rows.splice(rows.indexOf(r), 1); draw(); toast('Eliminado', 'ok'); } }
    } catch (err) { toast(err.message?.includes('violates foreign key') ? 'No se puede eliminar: hay productos en esta categoría.' : err.message, 'err'); }
  };
}

function uniqueSlug(name, rows) {
  const base = slugify(name) || 'categoria'; const taken = new Set(rows.map((r) => r.slug)); let s = base; let i = 2;
  while (taken.has(s)) s = `${base}-${i++}`; return s;
}

function bindImages(form) {
  form.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-image-for]'); if (!input?.files[0]) return;
    const key = input.dataset.imageFor; input.disabled = true;
    try { const url = await uploadImage(input.files[0], input.dataset.folder); form.elements[key].value = url; form.querySelector(`#prev-${key}`).src = url; toast('Imagen cargada', 'ok', 1800); }
    catch (err) { toast(err.message, 'err'); input.value = ''; } finally { input.disabled = false; }
  });
  form.addEventListener('click', (e) => { const b = e.target.closest('[data-clear-image]'); if (b) { form.elements[b.dataset.clearImage].value = ''; form.querySelector(`#prev-${b.dataset.clearImage}`).removeAttribute('src'); } });
}

function openForm(E, row, ctx, onSave) {
  const d = document.createElement('dialog'); d.className = 'modal';
  d.innerHTML = `<form novalidate><h2>${row ? 'Editar' : 'Nuevo'} ${E.singular}</h2>${E.fields.map((f) => renderField(f, row?.[f.key], ctx)).join('')}<div class="modal-actions"><button class="btn btn-outline" type="button" data-cancel>Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  document.body.append(d); d.showModal(); d.addEventListener('close', () => d.remove());
  const form = d.querySelector('form'); bindImages(form);
  form.querySelector('[data-cancel]').addEventListener('click', () => d.close());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data, errors } = collectForm(E.fields, form);
    Object.assign(errors, E.validate?.(data) ?? {});
    showFieldErrors(form, errors); if (Object.keys(errors).length) return;
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try { await onSave(data); d.close(); toast('Guardado', 'ok'); } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
  });
}

async function requestsView(view) {
  const [res, inq] = await Promise.all([repo.list('reservation_requests'), repo.list('private_event_inquiries')]);
  const STATES = [['pending', 'Pendiente'], ['confirmed', 'Confirmada'], ['rejected', 'Rechazada'], ['cancelled', 'Cancelada']];
  const sel = (t, r) => `<select data-status="${t}" data-id="${esc(r.id)}" aria-label="Estado">${STATES.map(([v, l]) => `<option value="${v}" ${r.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const byDate = (a, b) => (b.created_at || '').localeCompare(a.created_at || '');
  const table = (t, list, cols) => list.length ? `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th scope="col">${c[0]}</th>`).join('')}<th scope="col">Estado</th>${isAdmin() ? '<th scope="col"></th>' : ''}</tr></thead><tbody>${list.sort(byDate).map((r) => `<tr>${cols.map((c) => `<td>${c[1](r)}</td>`).join('')}<td>${sel(t, r)}</td>${isAdmin() ? `<td><button class="btn btn-danger btn-sm" data-del="${t}:${esc(r.id)}">Eliminar</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="state"><strong>Sin solicitudes</strong>Cuando lleguen, las vas a ver acá.</div>';
  const common = [['Recibida', (r) => esc(formatDateTime(r.created_at))], ['Contacto', (r) => `<strong>${esc(r.name)}</strong>${r.is_demo ? ' <span class="chip demo">Demo</span>' : ''}<br>${esc(r.contact)}`]];
  view.innerHTML = `<h1>Solicitudes</h1><p class="small">Contienen datos personales: usalas solo para responder al cliente. Una solicitud no es una reserva confirmada hasta que cambies su estado.</p>
    <h2 style="font-size:1.4rem;margin-top:20px">Reservas</h2>${table('reservation_requests', res, [...common, ['Pedido', (r) => `${esc(r.requested_date)} ${esc(String(r.requested_time).slice(0, 5))} · ${r.party_size} pers.<br><span class="small">${esc(r.reason)} ${esc(r.comments)}</span>`]])}
    <h2 style="font-size:1.4rem;margin-top:28px">Cumpleaños y eventos privados</h2>${table('private_event_inquiries', inq, [...common, ['Consulta', (r) => `${esc(r.event_type)} · ${r.guests} invitados${r.estimated_date ? ' · ' + esc(r.estimated_date) : ''}<br><span class="small">${esc(r.message)}</span>`]])}`;
  view.onchange = async (e) => { const s = e.target.closest('[data-status]'); if (!s) return; try { await repo.setStatus(s.dataset.status, s.dataset.id, s.value); toast('Estado actualizado', 'ok', 1800); } catch (err) { toast(err.message, 'err'); } };
  view.onclick = async (e) => { const b = e.target.closest('[data-del]'); if (!b) return; const [t, id] = b.dataset.del.split(':'); if (await confirmDialog('¿Eliminar esta solicitud y sus datos personales?')) { try { await repo.remove(t, id); toast('Eliminada', 'ok'); requestsView(view); } catch (err) { toast(err.message, 'err'); } } };
}

async function settingsView(view) {
  if (!isAdmin()) { view.innerHTML = '<div class="notice err">Solo los administradores pueden editar los ajustes.</div>'; return; }
  const s = await repo.getSettings();
  const all = SETTINGS_GROUPS.flatMap((g) => g.fields);
  view.innerHTML = `<h1>Ajustes</h1>
    <div class="card settings-group"><h2>Entorno</h2><p>Modo: <span class="chip ${IS_DEMO ? 'demo' : 'ok'}">${APP_MODE}</span> · Backend: <span class="chip">${BACKEND === 'supabase' ? 'Supabase' : 'Local (solo navegador)'}</span></p>
    <p class="small">El modo se define al compilar (VITE_APP_MODE) para que no pueda cambiarse desde el navegador. Límite de imágenes: ${MAX_IMAGE_MB} MB.</p>
    ${BACKEND === 'local' ? '<button class="btn btn-outline btn-sm" id="reset-demo" type="button">Restablecer datos de demostración</button>' : ''}</div>
    <form id="settings" novalidate>${SETTINGS_GROUPS.map((g) => `<div class="card settings-group"><h2>${g.title}</h2><div class="settings-grid">${g.fields.map((f) => renderField({ ...f, full: ['textarea', 'faq', 'image'].includes(f.type) }, s[f.key], { folder: 'brand' })).join('')}</div></div>`).join('')}
    <button class="btn btn-primary" type="submit">Guardar ajustes</button></form>`;
  const form = document.getElementById('settings'); bindImages(form);
  document.getElementById('reset-demo')?.addEventListener('click', async () => { if (await confirmDialog('Se borrarán los cambios locales y se recargarán los datos de ejemplo.')) { await localStore.reset(); toast('Datos restablecidos', 'ok'); settingsView(view); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const { data, errors } = collectForm(all, form);
    showFieldErrors(form, errors); if (Object.keys(errors).length) return toast('Revisá los campos marcados.', 'err');
    try { await repo.saveSettings(data); toast('Ajustes guardados', 'ok'); } catch (err) { toast(err.message, 'err'); }
  });
}

// ---------- Router ----------
async function route() {
  const key = (location.hash.replace(/^#\//, '') || 'dashboard').split('?')[0];
  const valid = navFor().some(([k]) => k === key) ? key : 'dashboard';
  const view = shell(valid);
  view.innerHTML = '<div class="skeleton"></div>';
  try {
    if (valid === 'dashboard') await dashboardView(view);
    else if (valid === 'requests') await requestsView(view);
    else if (valid === 'settings') await settingsView(view);
    else await entityView(view, valid);
  } catch (err) { view.innerHTML = `<div class="notice err" role="alert">No se pudo cargar: ${errMsg(err)}</div>`; }
}

async function start() {
  if (CONFIG_ERROR) return loginView(CONFIG_ERROR);
  session = await auth.getSession();
  if (session?.denied) { await auth.signOut(); session = null; return loginView('Tu usuario no tiene permisos de administración.'); }
  if (!session) return loginView();
  route();
}
window.addEventListener('hashchange', () => { if (session) route(); });
auth.onRecovery(() => loginView('', true));
start();
