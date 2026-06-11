# TurnoMonitores — Especificacion del producto

**Universidad de Caldas · Ingenieria de Software**

---

## 1. Vision statement

TurnoMonitores es un sistema web que permite a los coordinadores de sede de la Universidad de Caldas gestionar la asignacion de turnos de monitores academicos en las salas informaticas de las sedes Lans y Orlando Sierra, con control de disponibilidad, horarios y registro de asistencia en tiempo real.

El sistema elimina la dependencia de hojas de calculo y registros en papel, reduciendo los errores de asignacion, los cruces de horario y la perdida de trazabilidad, lo que permite a los coordinadores tomar decisiones oportunas y garantiza el cumplimiento de las restricciones horarias de cada monitor.

---

## 2. User stories

### US-1 — Asignacion de turno a monitor

**Como** coordinador de sede, **quiero** asignar un turno a un monitor en una sala disponible para un rango horario especifico, **para** garantizar cobertura sin cruces ni superacion de limites de horas.

**Prioridad:** Alta
**Dependencias:** US-2 (disponibilidad de salas), US-3 (perfil del monitor con acumulado de horas)

**Criterios de aceptacion:**

- **Dado** que una sala no tiene clase ni monitor asignado en ese horario — **Cuando** el coordinador asigna un monitor en ese rango — **Entonces** el turno queda registrado y la sala aparece como ocupada en la vista general.
- **Dado** que el monitor ya tiene 7 horas acumuladas en el dia — **Cuando** el coordinador intenta asignar otro turno ese dia — **Entonces** el sistema bloquea la asignacion y muestra el limite alcanzado.
- **Dado** que el monitor tiene 10 horas semanales acumuladas — **Cuando** se intenta crear un turno adicional esa semana — **Entonces** el sistema rechaza la operacion con un mensaje explicativo.

---

### US-2 — Consulta de disponibilidad de salas

**Como** monitor academico, **quiero** consultar en tiempo real que salas estan disponibles, ocupadas por clase o cubiertas por otro monitor, **para** saber a cual sala puedo ser asignado o reportarme.

**Prioridad:** Alta
**Dependencias:** US-1 (turnos activos), carga de horarios de clases por sede

**Criterios de aceptacion:**

- **Dado** que existen salas con distintos estados en la sede — **Cuando** el monitor accede a la vista de disponibilidad — **Entonces** ve cada sala con su estado actual: `libre`, `en_clase`, `con_monitor` o `cerrada`.
- **Dado** que una clase se cancela y el coordinador libera la sala — **Cuando** el monitor consulta la disponibilidad — **Entonces** la sala aparece como libre en un maximo de 30 segundos.
- **Dado** que es la sede Lans fuera del horario 7:00–15:00 — **Cuando** el monitor consulta disponibilidad — **Entonces** todas las salas aparecen como no disponibles por fuera de horario operativo.

---

### US-3 — Registro y modificacion de horas por eventualidad

**Como** coordinador de sede, **quiero** registrar y modificar el acumulado de horas de un monitor ante una eventualidad, **para** mantener la trazabilidad real de horas trabajadas en el semestre.

**Prioridad:** Alta
**Dependencias:** US-1 (turnos existentes), configuracion del periodo semestral

**Criterios de aceptacion:**

- **Dado** que un monitor no completo su turno por eventualidad — **Cuando** el coordinador edita las horas de ese turno — **Entonces** el acumulado diario y semanal del monitor se recalcula automaticamente.
- **Dado** que se realiza una modificacion — **Cuando** se guarda el cambio — **Entonces** queda registrado en el historial con fecha, usuario que modifico y valores anterior y nuevo.
- **Dado** que el coordinador define la fecha de inicio y fin de monitorias — **Cuando** intenta asignar un turno fuera de ese rango — **Entonces** el sistema lo impide y muestra el rango activo del semestre.

---

## 3. Out of scope (v1)

- Pago o liquidacion de horas a monitores — sin integracion con pasarelas ni nomina.
- Creacion automatica de horarios de clases — el coordinador los carga manualmente; pueden variar por reservas adicionales durante el semestre.
- Aplicacion movil nativa — el sistema funciona unicamente como aplicacion web responsiva.
- Gestion academica del monitor: notas, calificaciones o rendimiento como estudiante.
- Notificaciones push o SMS — sin canal de comunicacion activo hacia monitores en v1.
- Portal de autoservicio para estudiantes — el estudiante no interactua directamente con el sistema.

---

## 4. Riesgos

### R-1 — Formato inconsistente de horarios de clases
**Probabilidad:** Alta

Los horarios de clases no tienen un formato estandar entre sedes, lo que puede hacer que la carga inicial de datos sea costosa en tiempo y propensa a errores, retrasando la disponibilidad del sistema para pruebas reales.

**Mitigacion:** Definir desde el sprint 1 una plantilla CSV unica para importar horarios y validarla con los coordinadores antes de iniciar el desarrollo del modulo de disponibilidad.

---

### R-2 — Casos borde en la logica de restriccion de horas
**Probabilidad:** Media

La logica de restricciones de horas (diarias, semanales, por eventualidad y por rango semestral) puede presentar casos borde complejos que no queden cubiertos en los criterios de aceptacion iniciales.

**Mitigacion:** Construir una suite de pruebas unitarias exhaustiva sobre el modulo de calculo de horas desde la primera implementacion, con casos de borde documentados junto al PO.

---

### R-3 — Alcance no priorizado en tiempo limitado
**Probabilidad:** Media

Al ser un proyecto universitario con tiempo limitado, la entrega puede quedar incompleta si el alcance no se prioriza correctamente, dejando sin implementar funciones criticas como la trazabilidad de modificaciones.

**Mitigacion:** Implementar un backlog priorizado con entregas incrementales cada dos semanas, bloqueando features nuevos si algun modulo critico aun no esta estable.

---

## 5. Pregunta de validacion

**¿Quien carga los horarios de clases en el sistema y cual es el formato y frecuencia de esa carga?**

Toda la logica de disponibilidad, asignacion de turnos y deteccion de cruces depende de que el sistema sepa que salas estan ocupadas por clase en cada franja horaria. Si ese dato no entra de forma confiable, el nucleo del sistema no funciona.

**Respuesta definida con el PO:** El coordinador de salas es el responsable de cargar las salas y los horarios de clases. Los horarios pueden variar durante el semestre por reservas adicionales, por lo que el coordinador tambien gestiona esas actualizaciones.

---

## 6. Entregable minimo del taller (2 horas)

**Funcionalidad priorizada: US-2 — Vista de disponibilidad de salas**

Es la unica story que permite un flujo completo de punta a punta sin depender de logica acumulativa compleja. Las otras dos stories requieren validaciones de negocio (acumulado de horas, restricciones semanales) que no se pueden probar de forma significativa sin turnos reales ya creados.

### Backend — NestJS

**Endpoint:**
```
GET /salas/:sede
```

**Respuesta esperada:**
```json
[
  {
    "id": "uuid",
    "nombre": "Sala 101",
    "estado": "libre" | "en_clase" | "con_monitor" | "cerrada"
  }
]
```

**Validaciones:**
- El parametro `:sede` debe corresponder a un valor valido (`lans` | `orlando-sierra`). Retorna `400` si no coincide.
- Si la consulta se hace fuera del horario operativo de la sede, todos los estados se devuelven como `cerrada`.
- El endpoint responde en menos de 2 segundos con datos reales en base de datos PostgreSQL.

**Respuestas de error:**
- `400 Bad Request` — sede no reconocida.
- `500 Internal Server Error` — falla de conexion con la base de datos.

---

### Frontend — Next.js

**Pantalla:** Vista de disponibilidad de salas por sede.

**Campos y componentes:**
- Selector de sede (`Lans` / `Orlando Sierra`).
- Grilla de salas con diferenciacion visual por estado: color distinto para `libre`, `en_clase`, `con_monitor` y `cerrada`.
- Indicador de ultima actualizacion con timestamp.

**Comportamiento:**
- Al cargar la pagina, hace fetch al endpoint y renderiza el estado actual.
- Refresca automaticamente cada 30 segundos o al recibir actualizacion via polling.
- No requiere login para esta entrega — puede usar token hardcodeado o vista publica.

**Manejo de error:**
- Si el endpoint falla, muestra un mensaje de error no tecnico: `"No se pudo cargar la disponibilidad. Intenta de nuevo."` con boton de reintento.
- Si no hay salas para la sede seleccionada, muestra estado vacio explicativo.

---

### n8n

**Trigger:** Webhook `POST` en la ruta `/webhook/sala-estado`.

**Payload esperado:**
```json
{
  "salaId": "uuid",
  "nuevoEstado": "libre" | "en_clase" | "con_monitor" | "cerrada"
}
```

**Flujo:**
1. Recibe el webhook con `salaId` y `nuevoEstado`.
2. Ejecuta una actualizacion en PostgreSQL: `UPDATE salas SET estado = $1 WHERE id = $2`.
3. Responde `200 OK` al emisor.

**Resultado visible:** La pantalla del frontend refleja el nuevo estado en el siguiente ciclo de refresco (maximo 30 segundos) sin intervencion manual.

---

## 7. Criterios de aceptacion del taller

- [ ] `GET /salas/:sede` retorna un arreglo con `id`, `nombre` y `estado` para datos reales en base de datos, respondiendo en menos de 2 segundos.
- [ ] La pantalla muestra las salas de al menos una sede con diferenciacion visual por estado y es accesible desde el navegador sin configuracion adicional.
- [ ] El flujo de n8n recibe `{ salaId, nuevoEstado }` via webhook, actualiza la base de datos y el cambio se refleja en la pantalla en un maximo de 30 segundos.
