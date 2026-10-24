# Seguridad y privacidad

## Modelo
| Actor | Puede |
|---|---|
| Anónimo | Leer **solo** contenido publicado/vigente; enviar solicitudes **solo vía RPC**. No lee ni escribe solicitudes. |
| Autenticado sin rol | Igual que anónimo; no puede crearse un perfil ni modificar nada. |
| `editor` | Gestiona productos, categorías, promociones, eventos, experiencias; lee y cambia estado de solicitudes. |
| `admin` | Todo lo anterior + ajustes, perfiles y borrar solicitudes. |

La autorización está en **RLS** (`is_staff()`, `is_admin()` son `SECURITY DEFINER` con `search_path` fijo). Ocultar enlaces en el panel es solo UX.

## Controles implementados
- RLS activo en las 9 tablas; privilegios de tabla revocados y re-otorgados mínimos.
- Escritura anónima únicamente por funciones RPC con validación (fecha no pasada en zona Argentina, tamaño de grupo según configuración, consentimiento), **honeypot** y **límites**: 3 solicitudes/hora por contacto y 30/minuto globales.
- Constraints en BD (longitudes, precios ≥ 0, estados válidos).
- Storage: bucket con límite 5 MB y MIME `webp/jpeg/png`; escritura solo staff.
- Frontend: todo texto dinámico pasa por `esc()`; URLs por `safeUrl()`; carrito saneado; sin secretos (solo clave `anon`). Mapa embebido limitado a Google Maps/OpenStreetMap.
- Sin cookies de seguimiento ni analítica. No se manejan datos de tarjetas.
- Panel `noindex`, `robots.txt` con `Disallow: /admin/`; en demo todo el sitio `noindex`.

## Límites conocidos / recomendado antes de producción
1. **CAPTCHA** (p. ej. Cloudflare Turnstile) en formularios: el límite por contacto es evadible cambiando de contacto; el global (30/min) acota el abuso pero no lo impide.
2. Desactivar registro público en Supabase Auth; activar MFA para admins; contraseña ≥ 10 caracteres.
3. Encabezados HTTP (CSP, HSTS, X-Content-Type-Options) en el hosting.
4. Revisión legal de la política de privacidad (borrador incluido) bajo Ley 25.326 y registro de la base de datos ante la AAIP si corresponde.
5. Definir retención/borrado de solicitudes con datos personales.
6. Probar políticas contra el proyecto Supabase real (ver INFORME_PRUEBAS).

## Cómo comprobar las políticas
`npm run test:db` aplica las 3 migraciones sobre Postgres (PGlite) con roles `anon`/`authenticated` y verifica 21 casos (lectura pública, escrituras denegadas, solicitudes ajenas, rate-limit, honeypot, storage). Además, en el proyecto real: con la clave anon, `select` sobre `reservation_requests` debe devolver error/0 filas.
