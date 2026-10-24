# Instalación, configuración y despliegue

## Requisitos
Node ≥ 20, npm, una cuenta de Supabase (producción) y un hosting estático (Netlify, Vercel, Cloudflare Pages, GitHub Pages…).

## 1. Demo estática (sin Supabase)
`cp .env.example .env` (dejar `VITE_APP_MODE=demo`, claves vacías) → `npm ci && npm run build` → publicar `dist/`. Funciona en cualquier hosting estático (rutas relativas; sin reescrituras). La demo queda `noindex`.

## 2. Supabase (producción)
1. Crear proyecto. En **Authentication → Providers → Email**: desactivar *Allow new users to sign up*. Configurar la URL del sitio y las *Redirect URLs* (para recuperar contraseña).
2. Aplicar migraciones en orden (`supabase db push` con la CLI, o pegar en el SQL Editor): `0001_schema.sql`, `0002_rls.sql`, `0003_storage.sql`.
3. Datos de ejemplo (solo demo con backend): `supabase/seed.sql`. En producción **no** cargarlo, o borrar luego `delete from products where is_demo;` etc.
4. **Primer admin:** crear usuario en Authentication → Users (Auto Confirm) y ejecutar `supabase/create_first_admin.sql` con su email. Nunca desde el frontend.
5. En `.env`: `VITE_APP_MODE=production`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clave **anon**; jamás `service_role`), `VITE_SITE_URL`.

## 3. Datos reales
Panel → Ajustes: WhatsApp (formato `+54 9 11 …`), dirección, horarios, redes, logo y portada. Cargar carta real y reemplazar/eliminar contenido "Ejemplo". Sin WhatsApp válido el envío de pedidos queda desactivado.

## 4. Compilar y publicar
`npm ci && npm run build`; subir `dist/`. En producción el build genera `robots.txt` (`Disallow: /admin/`) y `sitemap.xml` (con `VITE_SITE_URL`). Dominio propio + HTTPS desde el hosting; agregar CSP/HSTS.

## 5. Verificación posterior
- Web carga sin errores de consola; carta con productos reales; `/admin/` pide login y un usuario sin rol es rechazado.
- Con la clave anon no se pueden leer `reservation_requests` ni escribir en `products`.
- Enviar una solicitud de prueba y verla en el panel como *Pendiente*; abrir un pedido y revisar el mensaje en WhatsApp.
- Subir una imagen; ver que se muestra públicamente.
- Quitar cualquier dato demo; confirmar `index, follow` en la home y `noindex` en `/admin/`.

**No** se modifica ni reemplaza ningún sitio existente: esto es un proyecto independiente. Publicar solo con autorización del cliente.
