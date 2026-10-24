# Arquitectura

## Decisiones
- **Vite + JS modular sin framework:** sin dependencias innecesarias; HTML semántico y bundle chico (≈10 KB gzip por app + cliente Supabase compartido ≈65 KB gzip).
- **Supabase:** Postgres + Auth + Storage con RLS; evita escribir un backend propio y la seguridad vive en la base.
- **Patrón repositorio:** `createRepo(store)` contiene la lógica; `store` es `supabaseStore` o `localStore`. Misma lógica en demo y producción → no se duplica negocio. Producción **exige** Supabase (`CONFIG_ERROR` si falta).
- **Dinero en centavos (enteros)** — columna `price_cents bigint`; `formatMoney` con `Intl` es-AR; `parsePesosToCents` sin floats.
- **Carrito:** se guarda solo `{id: cantidad}` en localStorage; precios siempre del catálogo vigente. Al enviar se vuelve a consultar el catálogo; si cambió algo, se avisa y se pide reconfirmar.
- **Panel declarativo:** `schemas.js` describe entidades y campos; un único generador de formularios/tablas (validación, imágenes, confirmaciones).
- **Modo demo/producción:** `VITE_APP_MODE` fijo al compilar (no editable desde el navegador). Demo: banners, datos "Ejemplo", `noindex`, mensajes de WhatsApp marcados como demostración.

## Flujos
- **Pedido:** carta → carrito → casilla de confirmación → verificación de precios → `wa.me/<n>?text=…`. El sistema **no sabe** si el cliente envió el mensaje; no se registra el pedido (v2).
- **Reserva/consulta:** validación en cliente → RPC `submit_reservation`/`submit_private_inquiry` (valida de nuevo, honeypot, límites) → estado `pending`. Cambia a confirmada/rechazada/cancelada solo desde el panel.
- **Imágenes:** validación de tipo/tamaño → recomprime a WebP (máx. 1600 px, quita EXIF) → nombre generado (UUID) → bucket `public-images`.

## Modelo de datos (ver `supabase/migrations`)
`profiles` · `categories` · `products` · `promotions` · `events` · `experiences` · `site_settings` · `reservation_requests` · `private_event_inquiries`. Restricciones CHECK de longitudes/valores, FKs, índices, `updated_at` por trigger. `product_images`, `orders` y `order_items` **no** se implementaron (una imagen por producto; pedidos no persistidos).

## Estados de UI
Carga (skeletons), error (avisos `role=alert`), éxito (toasts/avisos), vacío (bloques `.state`) en todas las secciones.
