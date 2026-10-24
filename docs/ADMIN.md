# Panel de administración (`/admin/`)

**Acceso.** Producción: email + contraseña de Supabase Auth; solo usuarios con fila en `profiles` (`admin`/`editor`). Sin registro público. Recuperación de contraseña por correo (enlace de Supabase → pantalla "Nueva contraseña"). Demo local: botón de demostración, datos solo en el navegador.

| Sección | Qué permite |
|---|---|
| Resumen | Productos activos / no disponibles, promociones vigentes, próximos eventos, solicitudes pendientes (cifras calculadas en vivo; sin estadísticas de pedidos porque no se persisten) |
| Productos | Crear/editar, precio (acepta `1.250,50`), foto, etiquetas, disponible/publicado/destacado, orden, **archivar** y restaurar; eliminar solo archivados, con confirmación |
| Categorías | Crear/editar/ocultar; no se pueden borrar si tienen productos |
| Promociones | Título, imagen, inicio/fin, borrador/publicada, condiciones, orden. Etiqueta Vigente/Programada/Vencida; las vencidas no se muestran al público |
| Eventos | Alta/edición, publicar/borrador, fechas; los pasados dejan de mostrarse |
| Experiencias | Actividades configurables con FAQ y botón de consulta |
| Solicitudes | Reservas y consultas de eventos; cambiar estado (Pendiente/Confirmada/Rechazada/Cancelada); eliminar (solo `admin`) |
| Ajustes (solo `admin`) | Nombre, frase, logo, portada, color, WhatsApp (se valida), teléfono, dirección, horarios, redes, mapa, FAQ, reglas de pedidos y reservas |

Imágenes: JPG/PNG/WebP, máx. `VITE_MAX_IMAGE_MB`, se optimizan a WebP. **Primer administrador:** `supabase/create_first_admin.sql` (ver DESPLIEGUE).
