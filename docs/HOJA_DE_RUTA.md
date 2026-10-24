# Hoja de ruta comercial

Complejidad: B/M/A. Costos operativos: estimaciones cualitativas a validar (planes de Supabase, mensajería y hosting varían).

## V1 — Web y gestión (esta demo)
**Objetivo:** presencia digital propia y autogestionable. **Beneficio:** menos dependencia de programador, pedidos y reservas ordenados. **Funciones:** web pública, carta, promociones, experiencias, eventos, pedidos a WhatsApp, solicitudes de reserva, panel, ajustes, seguridad y pruebas. **Complejidad:** M. **Dependencias:** datos reales, Supabase, dominio. **Riesgos:** contenido sin verificar, abuso de formularios sin CAPTCHA. **Costos:** hosting estático (bajo/gratis) + Supabase (gratis→pago según uso) + dominio. **Terminada cuando:** datos reales cargados, privacidad revisada, RLS probada en el proyecto real, CAPTCHA, autorización del cliente.

## V2 — Operación mejorada
**Objetivo:** reducir trabajo manual. **Beneficio:** menos pérdida de pedidos/reservas. **Funciones:** pedidos persistidos con estados (`orders`, `order_items`; el servidor recalcula importes), notificaciones por correo, historial/auditoría, reportes básicos, mejoras de reservas (franjas y cupos). **Complejidad:** M. **Dependencias:** reglas de reservas, proveedor de correo. **Riesgos:** expectativa de "tiempo real" sin personal que atienda. **Costos:** correo transaccional. **Terminada cuando:** el local gestiona pedidos y reservas sin salir del panel.

## V3 — The One Club
**Objetivo:** recurrencia. **Beneficio:** clientes frecuentes y datos propios. **Funciones:** registro, perfil, puntos por ledger, recompensas y canjes, cumpleaños, campañas, panel ([diseño](THE_ONE_CLUB.md)). **Complejidad:** A. **Dependencias:** reglas comerciales y método de verificación de consumo. **Riesgos:** fraude de puntos, privacidad. **Costos:** SMS/WhatsApp para campañas. **Terminada cuando:** canje verificado extremo a extremo sin posibilidad de duplicación.

## V4 — Integraciones
Caja/POS, inventario, pasarela de pagos (si se aprueba), notificaciones oficiales (WhatsApp Business API), analítica respetuosa, automatizaciones. **Complejidad:** A. **Dependencias:** APIs de terceros y contratos. **Riesgos:** acoplamiento, PCI (delegar en la pasarela). **Costos:** comisiones y licencias. **Terminada cuando:** el stock y los pagos se concilian automáticamente.

## V5 — Crecimiento
PWA instalable, segmentación avanzada, promociones personalizadas, estadísticas de recurrencia, multi-sucursal. **Complejidad:** M–A. **Riesgos:** consentimiento y privacidad. **Terminada cuando:** el modelo soporta N sucursales sin duplicar código.

## Ampliaciones evaluadas
| Ampliación | Valor | Dificultad | Dependencias | Riesgos | ¿Pago? |
|---|---|---|---|---|---|
| POS/caja | Alto | Alta | API del POS | Acople | Sí (licencia) |
| Inventario sincronizado | Alto | Alta | POS | Datos erróneos | Posible |
| Disponibilidad real de reservas | Alto | Media | Reglas de mesas/cupos | Complejidad operativa | No |
| Notificaciones por correo | Medio | Baja | Proveedor SMTP | Spam | Plan gratuito inicial |
| WhatsApp oficial (API) | Alto | Media | Cuenta Business, plantillas | Aprobación Meta | Sí |
| Cupones | Medio | Media | Reglas de negocio | Abuso | No |
| PWA | Medio | Baja | HTTPS | Caché desactualizada | No |
| Analítica sin cookies | Medio | Baja | Herramienta | Privacidad | Opcional |
| Pasarela de pagos | Alto | Alta | Cuenta comercial | Fraude, normativa | Comisión |
| Seguimiento de pedidos | Alto | Media | V2 | Expectativas | No |
| Multiusuario con permisos | Medio | Baja | Roles (ya hay admin/editor) | — | No |
| Exportación de reportes | Medio | Baja | V2 | Datos personales | No |
| Multi-sucursal | Medio | Media | Modelo `branches` | Migración | No |
