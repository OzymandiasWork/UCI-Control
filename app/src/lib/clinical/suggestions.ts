export interface Suggestion {
  atb: string
  goals: string[]
  monitor: string[]
}

// Contenido clínico migrado VERBATIM del prototipo uci_dashboard.jsx
// (validado por el equipo médico — no editar sin revisión clínica).
export const SUGGESTIONS: Record<string, Suggestion> = {
  'shock septico': { atb: 'Pip/Tazo + Vancomicina (cubrir MRSA si riesgo)', goals: ['Cultivos ANTES de ATB', 'Lactato control 2h', 'MAP meta >65 mmHg', 'Bundle sepsis 1h', 'Evaluar foco quirúrgico', 'Cristaloides 30 mL/kg si hipoperfusión'], monitor: ['Lactato c/2h hasta <2', 'Diuresis >0.5 mL/kg/h', 'ScvO₂ >70%'] },
  'shock distributivo': { atb: 'Pip/Tazo + Vancomicina', goals: ['Identificar foco', 'MAP >65 mmHg', 'Evaluar volumen responsiveness', 'Noradrenalina primera línea'], monitor: ['PAM continua', 'Lactato seriado', 'Balance hídrico estricto'] },
  'shock hemorragico': { atb: 'Profilaxis según cirugía', goals: ['Control hemorragia fuente', 'Transfusión GR si Hb<7 o inestable', 'PFC:GR ratio 1:1', 'Ácido tranexámico <3h del trauma', 'Temperatura >35°C'], monitor: ['Hb c/4-6h', 'TP/TTPK', 'Calcio iónico', 'TEG si disponible'] },
  'falla respiratoria': { atb: 'Según contexto clínico', goals: ['SpO₂ meta 92–96%', 'VM protectora: Vt 6mL/kg PBW', 'PEEP según tabla ARDSnet', 'Driving pressure <15 cmH₂O', 'Prono si PaO₂/FiO₂<150+SDRA moderado-severo'], monitor: ['Gasometría c/4-6h', 'Mecánica ventilatoria diaria', 'Intentar SBT si criterios'] },
  'nac': { atb: 'Amoxicilina/clavulánico + Azitromicina (o FQ respiratoria si alérgico)', goals: ['O₂ para SpO₂ >94%', 'Hidratación EV si no tolera VO', 'Evaluar criterios ATS/IDSA para UCI', 'Vacunación al egreso'], monitor: ['Temperatura diaria', 'Leucocitos', 'PCR/Procalcitonina', 'RX control si deterioro'] },
  'neumonia': { atb: 'Según probable agente y contexto (HAP/VAP: Pip/Tazo o Carbapenem±Vancomicina)', goals: ['VM protectora si IOT', 'Posición 30–45°', 'Higiene oral con clorhexidina', 'Deescalation según cultivos'], monitor: ['Cultivo BAL/aspirado traqueal', 'Días de VM', 'Criterios extubación'] },
  'acv': { atb: 'No indicado de rutina', goals: ['PA meta según tipo (isquémico: <185/110 si rtPA; hemorrágico: <140)', 'Glicemia 140–180 mg/dL', 'Temperatura <37.5°C', 'Anticoagulación según indicación', 'Neuroimagen control'], monitor: ['Neuroworsening c/1h primeras 24h', 'Glasgow', 'Deglución antes de VO'] },
  'pcr recuperado': { atb: 'No de rutina salvo foco', goals: ['TTM: normotermia estricta 36–37.5°C x 72h', 'MAP >65 mmHg', 'SpO₂ 94–98%', 'PaCO₂ 35–45 mmHg', 'EEG continuo si sospecha SE', 'Coronariografía según protocolo'], monitor: ['NSE 48–72h', 'EEG continuo 24h', 'Evaluación neurológica seriada'] },
  'ira': { atb: 'Según contexto', goals: ['Identificar y tratar causa (prerrenal/renal/posrenal)', 'Evitar nefrotóxicos', 'Ajuste de dosis renales', 'TRR si criterios KDIGO: K>6/acidosis/oliguria refractaria/sobrecarga'], monitor: ['Diuresis horaria', 'Creatinina diaria', 'K+, HCO3 diario', 'Balance hídrico'] },
  'politrauma': { atb: 'Profilaxis 24h si herida contaminada', goals: ['Control de daños si inestable', 'Transfusión masiva si necesario', 'Fijación fracturas según estabilidad', 'Profilaxis TVP', 'Movilización precoz cuando posible'], monitor: ['Hb/Hto c/6h fase aguda', 'Presión intraabdominal si riesgo', 'Dolor (EVA)'] },
  'perforacion viscera hueca': { atb: 'Pip/Tazo o Metronidazol+Ceftriaxona x 5–7 días', goals: ['Cirugía de urgencia', 'Control de foco', 'NPO hasta cierre foco', 'Soporte HD si sepsis asociada'], monitor: ['PCR/PCT diaria', 'Temperatura', 'Débito de drenajes'] },
  'trauma raquimedular': { atb: 'No rutina', goals: ['Inmovilización adecuada', 'MAP >85 mmHg primeras 7 días (médula)', 'Evitar hipoxia', 'Metilprednisolona SOLO si <8h (controversial)', 'Profilaxis TVP a las 72h'], monitor: ['Nivel neurológico ASIA diario', 'Función vesical', 'Prevención UPP'] },
  'sd convulsivo': { atb: 'No indicado', goals: ['BZD primera línea (Diazepam/Lorazepam)', 'Fenitoína/Levetiracetam segunda línea', 'EEG urgente si no mejora', 'Buscar causa subyacente (glucosa, Na, imagen)'], monitor: ['EEG si status', 'Glasgow', 'Saturación continua'] },
}

export function getSuggestion(diagnosis: string | undefined | null):
  ({ matched: string } & Suggestion) | null {
  if (!diagnosis) return null
  const key = diagnosis.toLowerCase().trim()
  for (const [k, v] of Object.entries(SUGGESTIONS)) {
    if (key.includes(k)) return { matched: k, ...v }
  }
  return null
}
