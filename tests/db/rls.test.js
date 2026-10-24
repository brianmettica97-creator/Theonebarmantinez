// Prueba REAL de migraciones y políticas RLS sobre Postgres (PGlite), con un stub mínimo de Supabase.
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const sql = (f) => readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), 'utf8');
const ADMIN = '00000000-0000-0000-0000-0000000000a1';
const EDITOR = '00000000-0000-0000-0000-0000000000e1';
const NOBODY = '00000000-0000-0000-0000-0000000000b1';
let db;

/** Ejecuta como rol anon/authenticated con un usuario, como hace PostgREST. */
async function as(role, uid, fn) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid || ''}', false);`);
  try { return await fn(); } finally { await db.exec('reset role;'); }
}
const denied = async (p) => { try { await p; return false; } catch { return true; } };

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant select, insert, update, delete on storage.objects to authenticated; grant usage on schema storage to anon, authenticated; grant select on storage.objects to anon;
    insert into auth.users values ('${ADMIN}'),('${EDITOR}'),('${NOBODY}');
  `);
  await db.exec(sql('0001_schema.sql'));
  await db.exec(sql('0002_rls.sql'));
  await db.exec(sql('0003_storage.sql'));
  await db.exec(`
    insert into profiles(id, role) values ('${ADMIN}','admin'),('${EDITOR}','editor');
    insert into categories(id,name,slug) values ('11111111-1111-1111-1111-111111111111','Comidas','comidas');
    insert into categories(id,name,slug,is_active) values ('22222222-2222-2222-2222-222222222222','Oculta','oculta',false);
    insert into products(category_id,name,price_cents,is_published) values
      ('11111111-1111-1111-1111-111111111111','Visible',1000,true),
      ('11111111-1111-1111-1111-111111111111','Borrador',1000,false);
    insert into promotions(title,status,starts_at,ends_at) values
      ('Vigente','published', now()-interval '1 day', now()+interval '1 day'),
      ('Vencida','published', now()-interval '5 day', now()-interval '1 day'),
      ('Futura','published', now()+interval '2 day', now()+interval '3 day'),
      ('Borrador','draft', null, null);
    insert into events(title,starts_at,status) values ('Próximo', now()+interval '3 day','published'),('Pasado', now()-interval '3 day','published'),('Borrador', now()+interval '3 day','draft');
    insert into site_settings(key,value,is_public) values ('reservations_max_party','10',true),('secreto','"x"',false);
  `);
});

describe('lectura pública (anon)', () => {
  it('solo ve productos publicados', async () => {
    const r = await as('anon', null, () => db.query('select name from products'));
    expect(r.rows.map((x) => x.name)).toEqual(['Visible']);
  });
  it('solo ve categorías activas', async () => {
    const r = await as('anon', null, () => db.query('select name from categories'));
    expect(r.rows.map((x) => x.name)).toEqual(['Comidas']);
  });
  it('promociones: solo vigentes y publicadas', async () => {
    const r = await as('anon', null, () => db.query('select title from promotions'));
    expect(r.rows.map((x) => x.title)).toEqual(['Vigente']);
  });
  it('eventos: solo publicados y futuros', async () => {
    const r = await as('anon', null, () => db.query('select title from events'));
    expect(r.rows.map((x) => x.title)).toEqual(['Próximo']);
  });
  it('no ve configuraciones no públicas', async () => {
    const r = await as('anon', null, () => db.query('select key from site_settings'));
    expect(r.rows.map((x) => x.key)).toEqual(['reservations_max_party']);
  });
});

describe('escritura no autorizada', () => {
  it('anon no puede insertar/actualizar/borrar contenido', async () => {
    expect(await as('anon', null, () => denied(db.query("insert into products(category_id,name,price_cents) values ('11111111-1111-1111-1111-111111111111','Hack',1)")))).toBe(true);
    expect(await as('anon', null, () => denied(db.query("update products set price_cents = 1")))).toBe(true);
    expect(await as('anon', null, () => denied(db.query("delete from products")))).toBe(true);
    expect(await as('anon', null, () => denied(db.query("insert into site_settings(key,value) values ('x','1')")))).toBe(true);
  });
  it('usuario autenticado SIN rol no puede modificar (RLS filtra, 0 filas)', async () => {
    expect(await as('authenticated', NOBODY, () => denied(db.query("insert into products(category_id,name,price_cents) values ('11111111-1111-1111-1111-111111111111','Hack',1)")))).toBe(true);
    const u = await as('authenticated', NOBODY, () => db.query('update products set price_cents = 1 returning id'));
    expect(u.rows).toHaveLength(0);
    const d = await as('authenticated', NOBODY, () => db.query('delete from promotions returning id'));
    expect(d.rows).toHaveLength(0);
  });
  it('un usuario sin rol no se puede auto-asignar admin', async () => {
    expect(await as('authenticated', NOBODY, () => denied(db.query(`insert into profiles(id, role) values ('${NOBODY}','admin')`)))).toBe(true);
  });
  it('editor no puede modificar la configuración', async () => {
    expect(await as('authenticated', EDITOR, () => denied(db.query("insert into site_settings(key,value) values ('whatsapp','\"5491100000000\"')")))).toBe(true);
  });
});

describe('staff', () => {
  it('editor gestiona productos y ve borradores', async () => {
    await as('authenticated', EDITOR, () => db.query("update products set price_cents = 2000 where name = 'Borrador'"));
    const r = await as('authenticated', EDITOR, () => db.query('select count(*)::int n from products'));
    expect(r.rows[0].n).toBe(2);
  });
  it('admin escribe configuración', async () => {
    await as('authenticated', ADMIN, () => db.query("insert into site_settings(key,value) values ('whatsapp','\"5491100000000\"')"));
    const r = await as('authenticated', ADMIN, () => db.query("select value from site_settings where key='whatsapp'"));
    expect(r.rows).toHaveLength(1);
  });
  it('precio negativo rechazado por constraint', async () => {
    expect(await as('authenticated', ADMIN, () => denied(db.query("update products set price_cents = -5")))).toBe(true);
  });
});

describe('solicitudes de reserva', () => {
  const future = "(current_date + 3)";
  const call = (extra = {}) => {
    const a = { name: 'Ana', contact: '+5491155550000', date: future, party: 4, consent: 'true', web: "''", ...extra };
    return `select submit_reservation('${a.name}','${a.contact}',${a.date},'21:00',${a.party},'Cumple','',${a.consent},${a.web})`;
  };
  it('anon puede enviar una solicitud válida (queda pendiente)', async () => {
    await as('anon', null, () => db.query(call()));
    const r = await as('authenticated', ADMIN, () => db.query('select status from reservation_requests'));
    expect(r.rows[0].status).toBe('pending');
  });
  it('anon NO puede leer ni escribir directo en solicitudes', async () => {
    expect(await as('anon', null, () => denied(db.query('select * from reservation_requests')))).toBe(true);
    expect(await as('anon', null, () => denied(db.query("insert into reservation_requests(name,contact,requested_date,requested_time,party_size,consent) values ('a','123456',current_date,'20:00',2,true)")))).toBe(true);
    expect(await as('authenticated', NOBODY, () => db.query('select * from reservation_requests'))).toMatchObject({ rows: [] });
  });
  it('valida fecha pasada, tamaño de grupo y consentimiento', async () => {
    expect(await as('anon', null, () => denied(db.query(call({ date: '(current_date - 1)' }))))).toBe(true);
    expect(await as('anon', null, () => denied(db.query(call({ party: 11, contact: '+5491100000001' }))))).toBe(true); // máx. configurado: 10
    expect(await as('anon', null, () => denied(db.query(call({ consent: 'false', contact: '+5491100000002' }))))).toBe(true);
  });
  it('honeypot: se descarta sin guardar', async () => {
    const before = (await db.query('select count(*)::int n from reservation_requests')).rows[0].n;
    await as('anon', null, () => db.query(call({ web: "'http://spam'", contact: '+5491100000003' })));
    expect((await db.query('select count(*)::int n from reservation_requests')).rows[0].n).toBe(before);
  });
  it('límite de frecuencia por contacto', async () => {
    const c = '+5491100000009';
    for (let i = 0; i < 3; i++) await as('anon', null, () => db.query(call({ contact: c })));
    expect(await as('anon', null, () => denied(db.query(call({ contact: c }))))).toBe(true);
  });
  it('solo admin puede eliminar solicitudes; staff cambia estado', async () => {
    const u = await as('authenticated', EDITOR, () => db.query("update reservation_requests set status='confirmed' where id = (select id from reservation_requests limit 1) returning status"));
    expect(u.rows[0].status).toBe('confirmed');
    const d = await as('authenticated', EDITOR, () => db.query('delete from reservation_requests returning id'));
    expect(d.rows).toHaveLength(0);
  });
});

describe('eventos privados', () => {
  it('anon envía consulta válida y no puede leerla', async () => {
    await as('anon', null, () => db.query("select submit_private_inquiry('Luis','+5491122223333','Cumpleaños',current_date+10,30,'Hola',true,'')"));
    expect(await as('anon', null, () => denied(db.query('select * from private_event_inquiries')))).toBe(true);
    const r = await as('authenticated', ADMIN, () => db.query('select count(*)::int n from private_event_inquiries'));
    expect(r.rows[0].n).toBe(1);
  });
});

describe('storage', () => {
  it('solo staff puede subir al bucket', async () => {
    expect(await as('anon', null, () => denied(db.query("insert into storage.objects(bucket_id,name) values ('public-images','x.webp')")))).toBe(true);
    expect(await as('authenticated', NOBODY, () => denied(db.query("insert into storage.objects(bucket_id,name) values ('public-images','x.webp')")))).toBe(true);
    await as('authenticated', EDITOR, () => db.query("insert into storage.objects(bucket_id,name) values ('public-images','x.webp')"));
  });
  it('el bucket limita tamaño y tipos', async () => {
    const r = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id='public-images'");
    expect(r.rows[0].file_size_limit).toBe(5242880);
    expect(r.rows[0].allowed_mime_types).toContain('image/webp');
  });
});
