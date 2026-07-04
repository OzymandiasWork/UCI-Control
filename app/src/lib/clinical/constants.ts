export type AlertKey = 'none' | 'moderate' | 'critical' | 'eol' | 'procurement' | 'trial'
export type AlertTone = 'ok' | 'warn' | 'danger' | 'eol' | 'proc' | 'trial'

export const ALERT_TYPES: Record<AlertKey, { label: string; tone: AlertTone }> = {
  none:        { label: 'Sin alerta',   tone: 'ok' },
  moderate:    { label: 'Moderado',     tone: 'warn' },
  critical:    { label: 'Crítico',      tone: 'danger' },
  eol:         { label: 'Fin de vida',  tone: 'eol' },
  procurement: { label: 'Procuración',  tone: 'proc' },
  trial:       { label: 'UCI Trial',    tone: 'trial' },
}

export const RESIDENTES = ['jimenez', 'saenz', 'razazi', 'rodriguez'] as const

// Listas migradas verbatim del prototipo uci_dashboard.jsx
export const NUTRITION_TYPES = ['Ayuno', 'Régimen liviano', 'Régimen común', 'NE por SNG', 'NE por OGS', 'NE por yeyunostomía', 'Nutrición Parenteral Total', 'Nutrición Parenteral Parcial', 'Dieta licuada', 'Dieta blanda'] as const
export const VM_MODES = ['—', 'VCV', 'PCV', 'PRVC', 'PSV', 'BIPAP/APRV', 'CPAP', 'HFNC', 'VMni (BiPAP)', 'Ventilación espontánea'] as const
export const ACCESS_TYPES = ['CVC', 'FAP', 'PICC', 'Port-a-cath', 'PVC', 'Diálisis', 'Marcapasos transitorio'] as const
export const PREVISIONES = ['Fonasa A', 'Fonasa B', 'Fonasa C', 'Fonasa D', 'Isapre', 'Particular', 'PRAIS', 'Otro'] as const

export const BOX_COUNT = 24
