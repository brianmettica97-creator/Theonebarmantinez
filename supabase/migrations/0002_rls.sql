-- Seguridad: RLS en todas las tablas. Principio: público = solo lo publicado; staff = gestión;
-- solicitudes de clientes entran SOLO por funciones RPC y nunca son legibles por anónimos.

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','editor'));
$$;
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_staff(), public.is_admin() from public;
grant execute on function public.is_staff(), public.is_admin() to anon, authenticated;

alter table public.profiles                enable row level security;
alter table public.categories              enable row level security;
alter table public.products                enable row level security;
alter table public.promotions              enable row level security;
alter table public.events                  enable row level security;
alter table public.experiences             enable row level security;
alter table public.site_settings           enable row level security;
alter table public.reservation_requests    enable row level security;
alter table public.private_event_inquiries enable row level security;

-- Privilegios mínimos a nivel de tabla (RLS filtra filas; esto limita operaciones)
revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.products, public.promotions, public.events,
                public.experiences, public.site_settings to anon;
grant select, insert, update, delete on public.categories, public.products, public.promotions,
      public.events, public.experiences, public.site_settings, public.reservation_requests,
      public.private_event_inquiries, public.profiles to authenticated;
grant select on public.categories, public.products, public.promotions, public.events,
                public.experiences, public.site_settings to authenticated;

-- Lectura pública: solo lo publicado / vigente
create policy categories_public_read on public.categories for select to anon, authenticated
  using (is_active);
create policy products_public_read on public.products for select to anon, authenticated
  using (is_published and archived_at is null);
create policy promotions_public_read on public.promotions for select to anon, authenticated
  using (status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy events_public_read on public.events for select to anon, authenticated
  using (status = 'published' and coalesce(ends_at, starts_at + interval '6 hours') >= now());
create policy experiences_public_read on public.experiences for select to anon, authenticated
  using (is_published);
create policy settings_public_read on public.site_settings for select to anon, authenticated
  using (is_public);

-- Gestión de contenido: staff (admin/editor)
create policy categories_staff_all on public.categories for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy products_staff_all on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy promotions_staff_all on public.promotions for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy events_staff_all on public.events for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy experiences_staff_all on public.experiences for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Configuración: solo admin escribe; staff lee todo (incluye no públicas)
create policy settings_staff_read on public.site_settings for select to authenticated using (public.is_staff());
create policy settings_admin_write on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Solicitudes: SIN acceso anónimo. Staff lee y cambia estado; solo admin elimina.
create policy reservations_staff_read on public.reservation_requests for select to authenticated using (public.is_staff());
create policy reservations_staff_update on public.reservation_requests for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy reservations_admin_delete on public.reservation_requests for delete to authenticated using (public.is_admin());
create policy inquiries_staff_read on public.private_event_inquiries for select to authenticated using (public.is_staff());
create policy inquiries_staff_update on public.private_event_inquiries for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy inquiries_admin_delete on public.private_event_inquiries for delete to authenticated using (public.is_admin());

-- Perfiles: cada usuario ve el suyo; admin gestiona. Nadie se auto-asigna rol.
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Alta de solicitudes (única vía de escritura anónima). SECURITY DEFINER con validación,
-- honeypot y límites de frecuencia. Recomendado en producción: sumar CAPTCHA (Turnstile).
-- ---------------------------------------------------------------------------
create function public.setting_int(p_key text, p_default int) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from public.site_settings where key = p_key and (value #>> '{}') ~ '^\d+$'), p_default);
$$;
create function public.setting_bool(p_key text, p_default boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.site_settings where key = p_key and (value #>> '{}') in ('true','false')), p_default);
$$;
revoke all on function public.setting_int(text,int), public.setting_bool(text,boolean) from public;

create function public.submit_reservation(
  p_name text, p_contact text, p_date date, p_time time, p_party_size int,
  p_reason text, p_comments text, p_consent boolean, p_website text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if coalesce(p_website,'') <> '' then return; end if;                       -- honeypot
  if not public.setting_bool('reservations_enabled', true) then raise exception 'reservations_disabled'; end if;
  if not coalesce(p_consent,false) then raise exception 'consent_required'; end if;
  if p_date < today or p_date > today + 365 then raise exception 'invalid_date'; end if;
  if p_party_size < 1 or p_party_size > public.setting_int('reservations_max_party', 20) then raise exception 'invalid_party_size'; end if;
  if (select count(*) from public.reservation_requests where contact = btrim(p_contact) and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.reservation_requests where created_at > now() - interval '1 minute') >= 30
  then raise exception 'rate_limit'; end if;
  insert into public.reservation_requests(name, contact, requested_date, requested_time, party_size, reason, comments, consent)
  values (btrim(p_name), btrim(p_contact), p_date, p_time, p_party_size, btrim(coalesce(p_reason,'')), btrim(coalesce(p_comments,'')), true);
end $$;

create function public.submit_private_inquiry(
  p_name text, p_contact text, p_event_type text, p_date date, p_guests int,
  p_message text, p_consent boolean, p_website text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if coalesce(p_website,'') <> '' then return; end if;
  if not public.setting_bool('private_events_enabled', true) then raise exception 'inquiries_disabled'; end if;
  if not coalesce(p_consent,false) then raise exception 'consent_required'; end if;
  if p_date is not null and p_date < today then raise exception 'invalid_date'; end if;
  if (select count(*) from public.private_event_inquiries where contact = btrim(p_contact) and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.private_event_inquiries where created_at > now() - interval '1 minute') >= 30
  then raise exception 'rate_limit'; end if;
  insert into public.private_event_inquiries(name, contact, event_type, estimated_date, guests, message, consent)
  values (btrim(p_name), btrim(p_contact), btrim(p_event_type), p_date, p_guests, btrim(coalesce(p_message,'')), true);
end $$;

revoke all on function public.submit_reservation(text,text,date,time,int,text,text,boolean,text) from public;
revoke all on function public.submit_private_inquiry(text,text,text,date,int,text,boolean,text) from public;
grant execute on function public.submit_reservation(text,text,date,time,int,text,text,boolean,text) to anon, authenticated;
grant execute on function public.submit_private_inquiry(text,text,text,date,int,text,boolean,text) to anon, authenticated;
