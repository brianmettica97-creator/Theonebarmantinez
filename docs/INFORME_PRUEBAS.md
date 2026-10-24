# Informe de pruebas

Fecha de ejecución: 2026-10-24 · Entorno: contenedor Linux, Node 22, Chromium (Playwright). Resultados reales de esta sesión.

## Resumen
| Suite | Resultado |
|---|---|
| `npm test` — unitarias (`tests/unit.test.js`) | **27/27 aprobadas** |
| `npm run test:db` — migraciones + RLS en Postgres (PGlite) | **21/21 aprobadas** |
| `npm run test:e2e` — Chromium, servidor de desarrollo | **29/29 aprobadas**, 0 errores de consola/JS |
| `npm run test:e2e` — contra el build compilado (`vite preview`) | **29/29 aprobadas** |
| Build demo y producción (`robots.txt`, `sitemap.xml`, meta robots) | Verificado a mano |
| Escaneo de secretos en el repo (service_role, JWT, claves) | Sin hallazgos |

## Defectos encontrados y corregidos durante las pruebas
1. **Alto — cambio de precio sin aviso:** al enviar el pedido, el carrito se redibujaba con los precios nuevos *antes* de compararlos, por lo que no avisaba y abría WhatsApp con el precio actualizado sin reconfirmación. Corregido (se compara contra lo que el cliente vio) y cubierto por E2E.
2. **Medio — avisos ocultos bajo el diálogo:** los toasts quedaban detrás del modal del carrito/panel. Corregido con `popover` (capa superior).
3. **Medio — formato de dinero:** `$ 9.500,5` en vez de `$ 9.500,50`. Corregido y cubierto por test unitario.
(Además se corrigieron tests propios con errores de cálculo/selector; no eran defectos del producto.)

## Aprobadas (cobertura real)
- **Navegación/visual:** inicio, secciones, menú móvil, barra inferior, sin scroll horizontal a 375 px, botones táctiles ≥ 44 px.
- **Carta:** categorías, destacados, búsqueda (con acentos), estado vacío, producto no disponible deshabilitado.
- **Carrito:** agregar, varios productos, cantidades, eliminar, subtotales/total (centavos), vacío, no disponible, cambio de precio, datos manipulados en localStorage, confirmación obligatoria, envío desactivado sin WhatsApp válido, URL `wa.me` y mensaje (con marca demo, nombre y observaciones).
- **Formularios:** obligatorios, fecha pasada/inexistente/lejana, personas inválidas, contacto, consentimiento, honeypot, confirmación "pendiente", consulta de evento privado.
- **Panel:** acceso protegido, dashboard, crear/editar producto, precio, imagen válida e inválida (GIF rechazado), validación de fechas, promoción, evento, estado de solicitudes, persistencia tras recargar, archivar/eliminar con confirmación, cierre de sesión; cambios reflejados en la web pública.
- **Seguridad:** XSS en nombre de producto (no se ejecuta); RLS: anónimo no escribe ni lee solicitudes; usuario sin rol no modifica ni se autoasigna admin; editor no toca ajustes; límite de frecuencia; storage solo staff.
- **Accesibilidad básica:** `lang`, skip link, imágenes con `alt`, etiquetas de formulario, foco inicial en el skip link.

## Pendientes / NO verificadas (no afirmar como probadas)
- **Supabase real:** `supabaseStore`, `auth` (login, recuperación de contraseña, rol), `uploadImage` a Storage y las RPC desde el cliente **no se ejecutaron contra un proyecto Supabase**. El SQL sí se probó en PGlite con un *stub* de `auth`/`storage` (no es el stack real de Supabase: sin PostgREST, sin JWT reales).
- **WhatsApp real:** el sandbox no tiene salida a `wa.me`; se verificó la URL generada, no la apertura en la app.
- **Dispositivos/navegadores:** solo Chromium (escritorio y emulación móvil 375 px). **No** se probó Android/iOS reales, Safari ni Firefox. Tampoco lectores de pantalla ni contraste medido con herramienta.
- **Rendimiento:** no se corrió Lighthouse/Web Vitals. Pendiente: optimizar el chunk compartido (cliente Supabase se carga aun en demo) y fotos reales.
- Navegación por teclado completa de diálogos y orden de foco: solo se probó el skip link (los `<dialog>` nativos aportan trampa de foco y Escape).
- Pruebas de carga y de abuso reales (spam distribuido), CAPTCHA.
- El sitio original no pudo auditarse (ver auditoría).
