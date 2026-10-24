-- The One Experience · esquema base (NOVANTIQ)
-- Importes en CENTAVOS (bigint). Todas las tablas expuestas tienen RLS (ver 0002).

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'editor' check (role in ('admin','editor')),
  created_at  timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete restrict,
  name         text not null check (char_length(name) between 1 and 100),
  description  text not null default '' check (char_length(description) <= 600),
  price_cents  bigint not null check (price_cents >= 0 and price_cents <= 100000000),
  image_url    text not null default '',
  is_available boolean not null default true,
  is_published boolean not null default true,
  is_featured  boolean not null default false,
  tags         text[] not null default '{}' check (cardinality(tags) <= 8),
  sort_order   integer not null default 0,
  archived_at  timestamptz,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_public_idx on public.products(is_published, archived_at);

create table public.promotions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 800),
  image_url   text not null default '',
  starts_at   timestamptz,
  ends_at     timestamptz,
  status      text not null default 'draft' check (status in ('draft','published')),
  conditions  text not null default '' check (char_length(conditions) <= 800),
  sort_order  integer not null default 0,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 800),
  image_url   text not null default '',
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  info        text not null default '' check (char_length(info) <= 600),
  status      text not null default 'draft' check (status in ('draft','published')),
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.experiences (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 100),
  description   text not null default '' check (char_length(description) <= 800),
  image_url     text not null default '',
  info          text not null default '' check (char_length(info) <= 600),
  faq           jsonb not null default '[]' check (jsonb_typeof(faq) = 'array'),
  allow_booking boolean not null default false,
  is_published  boolean not null default false,
  sort_order    integer not null default 0,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.site_settings (
  key        text primary key check (char_length(key) <= 60),
  value      jsonb not null,
  is_public  boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.reservation_requests (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 80),
  contact        text not null check (char_length(contact) between 6 and 120),
  requested_date date not null,
  requested_time time not null,
  party_size     integer not null check (party_size between 1 and 200),
  reason         text not null default '' check (char_length(reason) <= 120),
  comments       text not null default '' check (char_length(comments) <= 1000),
  status         text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled')),
  consent        boolean not null check (consent),
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index reservation_status_idx on public.reservation_requests(status, created_at desc);
create index reservation_contact_idx on public.reservation_requests(contact, created_at desc);

create table public.private_event_inquiries (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 80),
  contact        text not null check (char_length(contact) between 6 and 120),
  event_type     text not null check (char_length(event_type) between 2 and 80),
  estimated_date date,
  guests         integer not null check (guests between 1 and 2000),
  message        text not null default '' check (char_length(message) <= 1000),
  status         text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled')),
  consent        boolean not null check (consent),
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index inquiry_status_idx on public.private_event_inquiries(status, created_at desc);
create index inquiry_contact_idx on public.private_event_inquiries(contact, created_at desc);

-- updated_at automático
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['categories','products','promotions','events','experiences','site_settings','reservation_requests','private_event_inquiries']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
