# DON DOCUMENTO: repos, links y dirección técnica para Plataforma UCI / Salud / Flujos Clínicos

> Guardado el 2026-07-04 como carta de navegación para la evolución de UCI Control
> (v1 en producción en https://ucicontrol.cl) hacia una plataforma clínica completa.

Este documento reúne una lista amplia de referencias open source y técnicas para evolucionar el proyecto UCI Torre Valech HUAP desde un dashboard operativo hacia una plataforma clínica más completa, con foco en boxes UCI, patient flow, dotación/turnos, sobrecarga asistencial e interoperabilidad.

## Repos clave para usar como base

| Repositorio | Link | Rol recomendado |
|---|---|---|
| OpenEMR | [github.com/openemr/openemr](https://github.com/openemr/openemr) | Base de referencia para EHR/EMR completo y flujos clínicos consolidados. |
| OpenMRS | [github.com/openmrs](https://github.com/openmrs) | Arquitectura modular de EMR y ecosistema fuerte para salud pública y hospitalaria. |
| Medplum | [github.com/medplum/medplum](https://github.com/medplum/medplum) | Mejor candidato para backend moderno FHIR + SDK + componentes React reutilizables. |
| smart-icu-dashboard | [github.com/Sumeet2005/smart-icu-dashboard](https://github.com/Sumeet2005/smart-icu-dashboard) | Referencia directa para monitoreo UCI con IA, signos vitales y riesgo clínico. |
| hospital-monitor-dashboard | [github.com/DamascenoRafael/hospital-monitor-dashboard](https://github.com/DamascenoRafael/hospital-monitor-dashboard) | Referencia visual y funcional para grilla de camas/boxes hospitalarios. |
| patientflow | [github.com/UCL-CORU/patientflow](https://github.com/UCL-CORU/patientflow) | Predicción de demanda de camas y patient flow en tiempo real. |
| patient-monitoring IG | [github.com/hl7-be/patient-monitoring](https://github.com/hl7-be/patient-monitoring) | Base de interoperabilidad FHIR para monitoreo de pacientes. |
| nurse-scheduling | [github.com/j3soon/nurse-scheduling](https://github.com/j3soon/nurse-scheduling) | Automatización de turnos y dotación de enfermería con reglas complejas. |
| Hospital Bed Management System | [github.com/Ansarimajid/Hospital-Management-System](https://github.com/Ansarimajid/Hospital-Management-System) | Gestión simple de disponibilidad y asignación de camas. |
| Hospease | [github.com/yugalgaur174/Hospease](https://github.com/yugalgaur174/Hospease) | Suite hospitalaria más amplia con módulos operativos adicionales. |

## Agrupación por dominio funcional

### UCI y monitoreo clínico
`smart-icu-dashboard` combina monitoreo de pacientes UCI con seguimiento de signos vitales y predicción de riesgo de sepsis — útil como referencia de producto para vigilancia clínica en tiempo real. `hospital-monitor-dashboard` aporta referencia para la capa visual de camas/boxes con información en tiempo real por cama y vista detallada.

### Flujo de pacientes y camas
`patientflow` predice demanda de camas hospitalarias en tiempo real (admisión, alta, traslado) — calza con la calculadora de sobrecarga asistencial y predicción de ocupación. `Hospital Bed Management System` y `Hospease` como referencia CRUD/operacional.

### Dotación, turnos y staffing
`nurse-scheduling` es el repo más alineado al módulo "Roles del Turno" (programación de enfermería con restricciones reales). El topic `shift-management` de GitHub para benchmarking adicional.

### Historia clínica, formularios y plataforma clínica base
OpenEMR como referencia de madurez funcional; OpenMRS por ecosistema modular; Medplum sobresale por enfoque developer-first, FHIR y stack TypeScript/React sin vendor lock-in.

## Recomendación arquitectónica

Medplum como mejor base de plataforma (FHIR + TypeScript/React + componentes) que puede convivir con el frontend actual. Estrategia: conservar la capa de UI actual, rediseñar grilla/ejecutivo inspirándose en `hospital-monitor-dashboard`, y mover persistencia/formularios/interoperabilidad a base tipo Medplum/FHIR. Para inteligencia operativa: `patientflow` (demanda de camas) y `smart-icu-dashboard` (señales tempranas), sin copiar lógica ciegamente.

## Librerías y referencias de diseño UX/UI

Mobbin (flujos y patrones de apps reales), Page Flows (recorridos completos), Dribbble (`medical-app`, `healthcare-app`), Behance (casos de estudio con narrativa).

## Topics y colecciones útiles en GitHub

| Colección | Link | Uso |
|---|---|---|
| patient-management-system | [github.com/topics/patient-management-system](https://github.com/topics/patient-management-system) | Repos pequeños/medianos para UI, CRUD y arquitectura full-stack en salud. |
| shift-management | [github.com/topics/shift-management](https://github.com/topics/shift-management) | Comparar enfoques de dotación y calendarización. |
| icu | [github.com/topics/icu](https://github.com/topics/icu) | Cuidados críticos — revisar manualmente por falsos positivos. |
| Health Samurai open source | [health-samurai.io/opensource](https://www.health-samurai.io/opensource) | Tooling FHIR, schema, codegen y componentes. |

## Riesgos y filtros de búsqueda

Colisión fuerte con la sigla `ICU`: GitHub devuelve `unicode-org/icu` (internacionalización Unicode, NO cuidados intensivos). Cualquier pipeline de búsqueda/ranking debe excluirlo explícitamente.

## Prompt maestro (para futura sesión de plataforma)

Objetivo: convertir UCI Control en plataforma clínica escalable manteniendo el UX operativo actual y migrando progresivamente a arquitectura interoperable.

1. Analizar `medplum/medplum` como base de backend clínico moderno (auth, FHIR, formularios, componentes React).
2. `DamascenoRafael/hospital-monitor-dashboard` como referencia de UI de grilla de boxes en tiempo real.
3. `UCL-CORU/patientflow` para motor de predicción de demanda de camas y sobrecarga.
4. `j3soon/nurse-scheduling` para módulo de roles del turno y asignación de personal.
5. `Sumeet2005/smart-icu-dashboard` para scoring clínico, signos vitales y alertas.
6. `hl7-be/patient-monitoring` + tooling Health Samurai para estrategia FHIR.
7. Referencias secundarias: OpenEMR, OpenMRS, Hospease, Hospital Bed Management System.
8. Excluir `unicode-org/icu`.

Entregables: mapa de arquitectura objetivo, árbol de módulos, plan de migración, diseño de datos clínicos/operacionales, stack final, lista priorizada de repos.

## Shortlist inicial

Medplum, patientflow, hospital-monitor-dashboard, smart-icu-dashboard, nurse-scheduling, patient-monitoring IG — cubren backend clínico, UI de camas, predicción operativa, monitoreo crítico, staffing e interoperabilidad. Segunda capa: OpenEMR, OpenMRS, Hospease, Health Samurai, topics de patient management y shift management.

## Nota de contexto (estado actual del proyecto)

La v1 en producción usa React + Vite + Supabase (Postgres/Auth/Realtime) con RLS — esta base cubre bien la fase actual (una unidad, un hospital). La adopción de Medplum/FHIR se justifica cuando aparezca la necesidad real de interoperar con sistemas del HUAP (HIS/LIS) o escalar a múltiples unidades/hospitales; hasta entonces, conviene diseñar el modelo de datos con FHIR en mente (mapeo stays→Encounter, sofa_assessments→Observation) sin migrar prematuramente.
