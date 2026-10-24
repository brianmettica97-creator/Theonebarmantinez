# Entrega: estado, pendientes y errores

## Funciones completadas y verificadas (demo)
Web pública (inicio, carta con categorías/búsqueda/destacados/disponibilidad, promociones con vigencia, experiencias, eventos con estado vacío, reservas y eventos privados con validación, contacto con ocultamiento de datos faltantes, política de privacidad borrador); carrito y mensaje de WhatsApp; modo demo/producción; panel completo (productos, categorías, promociones, eventos, experiencias, solicitudes, ajustes, imágenes); migraciones SQL con RLS, RPC con límites y storage; documentación; pruebas.

## Requiere datos del cliente / credenciales
| Falta | Para qué |
|---|---|
| Acceso al sitio actual, logo, paleta, fotos autorizadas | Identidad visual real, hero e imágenes (hoy: placeholders) |
| Carta, precios y disponibilidad reales | Reemplazar productos de ejemplo |
| WhatsApp, teléfono, dirección, horarios, redes | Contacto y pedidos (hoy vacíos; envío desactivado) |
| Confirmar actividades (pool, simuladores…), tarifas, condiciones | Sección Experiencias |
| ¿Ofrece eventos privados/cumpleaños? Política de reservas | Activar/desactivar formularios y textos |
| Proyecto Supabase + dominio | Persistencia real, panel con login, imágenes |
| Revisión legal de privacidad (Ley 25.326) | Publicación |
| CAPTCHA (Turnstile) | Protección de formularios |

## No implementado (a propósito, fuera de alcance v1)
Persistencia de pedidos (`orders`), pagos, notificaciones por correo/WhatsApp, disponibilidad real de reservas, fidelización, múltiples imágenes por producto (`product_images`), PWA, analítica. Ver [HOJA_DE_RUTA](HOJA_DE_RUTA.md).

## Errores y limitaciones conocidos
- Demo local: los datos están **por navegador** (no compartidos); `localStorage` ~5 MB (imágenes se reducen a 900 px).
- El filtrado de promociones/eventos por fecha en BD usa `now()` en cada consulta (correcto), pero un evento sin `ends_at` se considera vigente hasta 6 h después del inicio (regla asumida, configurable en código/RLS).
- El rol `editor` no ve Ajustes (el panel redirige) y, además, RLS le impide escribir `site_settings`.
- La clave de WhatsApp acepta solo formato internacional explícito (`+54…` o `54…`); números locales sin código se rechazan a propósito.
- No hay paginación en el panel (volúmenes esperados bajos).
- Hero sin foto real: usa degradado hasta cargar una imagen desde Ajustes.
