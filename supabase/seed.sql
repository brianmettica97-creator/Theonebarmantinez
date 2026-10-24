-- DATOS DE EJEMPLO (is_demo = true). NO son la carta, precios ni promociones reales de The One.
-- Cargar solo en entornos de demostración. Antes de producción: borrar con
--   delete from products where is_demo; delete from categories where is_demo; ... (ver docs/DEPLOY.md)

insert into public.categories (id, name, slug, sort_order, is_demo) values
  ('00000000-0000-4000-8000-0000000000c1', 'Comidas', 'comidas', 1, true),
  ('00000000-0000-4000-8000-0000000000c2', 'Tragos', 'tragos', 2, true),
  ('00000000-0000-4000-8000-0000000000c3', 'Sin alcohol', 'sin-alcohol', 3, true)
on conflict (id) do nothing;

insert into public.products (category_id, name, description, price_cents, is_available, is_featured, tags, sort_order, is_demo) values
  ('00000000-0000-4000-8000-0000000000c1', 'Hamburguesa de ejemplo', 'Producto demostrativo. Reemplazar por la carta real del local.', 950000, true, true, '{Ejemplo}', 1, true),
  ('00000000-0000-4000-8000-0000000000c1', 'Tabla para compartir (ejemplo)', 'Producto demostrativo.', 1480000, true, false, '{Ejemplo,"Para compartir"}', 2, true),
  ('00000000-0000-4000-8000-0000000000c1', 'Plato agotado (ejemplo)', 'Muestra cómo se ve un producto sin disponibilidad.', 880000, false, false, '{Ejemplo}', 3, true),
  ('00000000-0000-4000-8000-0000000000c2', 'Trago de autor (ejemplo)', 'Producto demostrativo.', 740000, true, true, '{Ejemplo}', 4, true),
  ('00000000-0000-4000-8000-0000000000c2', 'Cerveza tirada (ejemplo)', 'Producto demostrativo.', 520000, true, false, '{Ejemplo}', 5, true),
  ('00000000-0000-4000-8000-0000000000c3', 'Limonada (ejemplo)', 'Producto demostrativo.', 390000, true, false, '{Ejemplo}', 6, true);

insert into public.promotions (title, description, starts_at, ends_at, status, conditions, sort_order, is_demo) values
  ('Promoción de ejemplo (vigente)', 'Así se ve una promoción publicada. No es una oferta real.', now() - interval '3 days', now() + interval '30 days', 'published', 'Condiciones de ejemplo.', 1, true);

insert into public.experiences (title, description, info, faq, allow_booking, is_published, sort_order, is_demo) values
  ('Experiencia de ejemplo: Pool', 'Módulo demostrativo. Confirmar con el local qué experiencias ofrece antes de publicar.', 'Tarifas, horarios y disponibilidad: por confirmar.', '[]', true, true, 1, true);

-- Ajustes: NO se cargan datos de contacto. Se completan desde el panel (Ajustes).
insert into public.site_settings (key, value) values
  ('business_name', '"The One Bar Martínez"'),
  ('reservations_max_party', '20'),
  ('reservations_enabled', 'true'),
  ('private_events_enabled', 'true'),
  ('orders_enabled', 'true')
on conflict (key) do nothing;
