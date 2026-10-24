# The One Experience — propuesta de NOVANTIQ para The One Bar Martínez

> **VERSIÓN DE DEMOSTRACIÓN.** Todo el contenido (carta, precios, promociones, eventos, experiencias, imágenes) es **de ejemplo** y está marcado como tal. No hay datos verificados del negocio: dirección, teléfono, WhatsApp y horarios quedan **vacíos y configurables**.

Plataforma web mobile-first con carta digital, pedidos preparados para WhatsApp, solicitudes de reserva y de eventos privados, promociones, eventos, experiencias y un **panel de administración**. HTML + CSS + JavaScript modular con Vite; backend preparado para **Supabase** (PostgreSQL, Auth, Storage, RLS).

## Ejecutar en 1 minuto (demo, sin backend)

```bash
npm install
npm run dev          # http://localhost:5173  ·  panel: http://localhost:5173/admin/
```
En modo demo sin Supabase los datos viven en el navegador (localStorage) y el panel entra con un botón de demostración (no hay credenciales). Las solicitudes **no llegan a ningún negocio**.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run preview` | Compila a `dist/` / sirve lo compilado |
| `npm test` | 48 pruebas: unitarias + migraciones/RLS sobre Postgres real (PGlite) |
| `npm run test:e2e` | 29 pruebas en Chromium (requiere `npm run dev` o `BASE_URL=http://localhost:4173` con `preview`) |

## Estructura
```
index.html, admin/index.html     Páginas (web pública y panel)
src/config/                      env.js (única lectura de variables) y valores por defecto
src/utils/                       dinero (centavos), fechas, escapado HTML, placeholders
src/services/                    carrito, WhatsApp, validadores, visibilidad, imágenes (lógica pura y testeada)
src/repositories/                acceso a datos: createRepo (lógica) + localStore | supabaseStore, auth
src/components/                  secciones públicas, carta, carrito, formularios, toasts
src/pages/public|admin/          arranque de cada aplicación; admin: schemas declarativos + formularios genéricos
supabase/migrations/             0001 esquema · 0002 RLS + RPC · 0003 storage
supabase/seed.sql                datos de ejemplo (is_demo = true) · create_first_admin.sql
tests/                           unit.test.js · db/rls.test.js · scripts/e2e-smoke.mjs
docs/                            auditoría, arquitectura, seguridad, admin, despliegue, pruebas, hoja de ruta…
```

## Documentación
[Auditoría](docs/00-AUDITORIA.md) · [Arquitectura](docs/ARQUITECTURA.md) · [Seguridad](docs/SEGURIDAD.md) · [Panel](docs/ADMIN.md) · [Despliegue](docs/DESPLIEGUE.md) · [Informe de pruebas](docs/INFORME_PRUEBAS.md) · [Entrega y pendientes](docs/ENTREGA.md) · [Hoja de ruta](docs/HOJA_DE_RUTA.md) · [The One Club](docs/THE_ONE_CLUB.md) · [Guía para presentar la demo](docs/GUIA_DEMO_COMERCIAL.md)
