# The One Club — arquitectura de fidelización (no implementada)

La v1 ya aporta: `profiles` con roles, `site_settings` (reglas configurables), RLS, RPC `SECURITY DEFINER` y panel declarativo. El programa se agrega sin rehacer nada.

## Esquema propuesto (migración futura `0004_loyalty.sql`)
```sql
customers(id uuid pk references auth.users, member_code text unique, full_name, birthday date, marketing_consent bool, created_at)
loyalty_rules(id, kind check (kind in ('earn','expire','redeem')), config jsonb, is_active, valid_from, valid_to)
loyalty_ledger(id, customer_id, delta int not null check (delta <> 0), reason text, source text, source_ref text, created_by uuid, created_at,
               unique (source, source_ref))          -- idempotencia: evita duplicar puntos por la misma operación
rewards(id, name, cost_points int, conditions text, is_active, stock int)
redemptions(id, customer_id, reward_id, ledger_id, status, code text unique, created_at)
-- saldo = vista/función: sum(delta) por cliente; NUNCA una columna editable
```
## Reglas de integridad
- **Saldo derivado del ledger**: solo inserciones; los ajustes manuales son filas con `created_by` y requieren rol autorizado (permiso configurable).
- **Canje atómico** en una RPC: bloquea cliente (`for update`), valida saldo, regla vigente y stock, inserta movimiento negativo y canje; el `unique(source, source_ref)` impide canjes repetidos.
- **Sin puntos por consumos no verificados:** acreditar solo vía (a) confirmación de un empleado con código/ticket único, o (b) integración con caja/POS. Hay que acordar cuál con The One antes de implementar.
- RLS: el cliente lee solo lo suyo; nunca escribe saldo.

## A definir con el negocio
Cómo se ganan puntos y qué consumos califican, valor de recompensas, vencimiento, condiciones de beneficios, quién aprueba ajustes, beneficios de cumpleaños, segmentación. **No se inventaron reglas.**

## Métricas futuras
Recurrencia, frecuencia, canjes por recompensa, clientes inactivos, valor por cliente.
