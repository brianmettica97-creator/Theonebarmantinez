# Fase 1 — Auditoría

## Entorno
- Repositorio vacío (sin commits). Node 22, npm 10, Chromium + Playwright disponibles. Sin `gh`; GitHub vía MCP.
- Arquitectura definida desde cero: HTML/CSS/JS modular + Vite; Supabase como backend (justificación en [ARQUITECTURA](ARQUITECTURA.md)).

## Sitio existente (https://theonebarmartinez.com.ar/) — **NO se pudo inspeccionar**
- `WebFetch` devolvió `ENOTFOUND`; `curl` por el proxy del entorno devolvió `403` para el dominio (y variantes `www` y `.com`). Una búsqueda web no encontró información del local.
- **Consecuencia:** no se verificó estructura, identidad visual, carta, canales de contacto ni modalidades de pedido/reserva del sitio actual. **No se copió ni se supuso nada.** No hay logo, colores ni fotos reales del negocio.

### Datos verificados vs. suposiciones
| Dato | Estado |
|---|---|
| Nombre "The One" / "The One Bar Martínez" | Dado por el encargo (no contrastado con el sitio) |
| Dirección, teléfono, WhatsApp, horarios, redes | **Sin verificar → vacíos y configurables** (se ocultan si faltan) |
| Carta y precios | **Sin verificar →** 9 productos de ejemplo marcados "Ejemplo" |
| Pool y simuladores de carreras | **Sin verificar →** 2 experiencias de ejemplo "por confirmar" |
| Color de acento (ámbar `#ff9d2e`) | **Suposición de diseño**: no se analizó la identidad real. Editable desde Ajustes |
| Servicio de eventos privados | Sin confirmar: habilitado por defecto pero desactivable en Ajustes |

### Hallazgos/oportunidades (a validar contra el sitio real cuando haya acceso)
Estas son hipótesis de valor, no críticas al sitio actual: carta con búsqueda/filtros y disponibilidad por producto; pedido armado y ordenado hacia WhatsApp; solicitudes de reserva con estados; promociones con vigencia automática; panel para que el negocio edite sin programador; base para fidelización.

### Para completar la auditoría
Revisar manualmente el sitio y: sacar paleta/logo, listar funcionalidades existentes que **no** deban perderse, confirmar contacto y horarios, y reemplazar contenido de ejemplo.
