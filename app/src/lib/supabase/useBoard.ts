import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './client'
import type { Stay, StayFull } from './types'

const BOARD_KEY = ['board']
const EVENTS_KEY = ['events']

async function fetchBoard(): Promise<StayFull[]> {
  const { data, error } = await supabase
    .from('stays')
    .select('*, goals(*), antibiotics(*), accesses(*), nutrition(*), sofa_assessments(*), vent_settings(*), blood_gases(*)')
    .eq('active', true)
    .order('box_number')
  if (error) throw error
  return data as unknown as StayFull[]
}

export function useBoard() {
  const qc = useQueryClient()

  // Realtime: cualquier cambio en las tablas públicas refresca tablero y agenda
  useEffect(() => {
    const channel = supabase
      .channel('board-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        qc.invalidateQueries({ queryKey: BOARD_KEY })
        qc.invalidateQueries({ queryKey: EVENTS_KEY })
        qc.invalidateQueries({ queryKey: ['turno'] })
        qc.invalidateQueries({ queryKey: ['occupancy'] })
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [qc])

  return useQuery({ queryKey: BOARD_KEY, queryFn: fetchBoard })
}

/** Actualización optimista de campos escalares del stay */
export function useUpdateStay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Stay> }) => {
      const { error } = await supabase.from('stays').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: BOARD_KEY })
      const prev = qc.getQueryData<StayFull[]>(BOARD_KEY)
      qc.setQueryData<StayFull[]>(BOARD_KEY, old =>
        old?.map(s => (s.id === id ? { ...s, ...patch } : s)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(BOARD_KEY, ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** Ingreso de paciente a un box libre */
export function useAdmitStay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (boxNumber: number) => {
      const { error } = await supabase.from('stays').insert({ box_number: boxNumber })
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** Egreso: el stay deja de estar activo (el box queda libre, los datos se archivan) */
export function useDischargeStay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stays').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** CRUD genérico de tablas hijas (goals, antibiotics, accesses) */
export function useChildRow(table: 'goals' | 'antibiotics' | 'accesses' | 'blood_gases') {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: BOARD_KEY })
  return {
    insert: useMutation({
      mutationFn: async (row: Record<string, unknown>) => {
        const { error } = await supabase.from(table).insert(row)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
        const { error } = await supabase.from(table).update(patch).eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
  }
}

/** Nutrición (1:1 con el stay) */
export function useUpsertNutrition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: { stay_id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from('nutrition').upsert(row)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** Parámetros ventilatorios (1:1 con el stay) */
export function useUpsertVent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: { stay_id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from('vent_settings').upsert(row)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** SOFA del día: upsert sobre (stay_id, assessed_on) */
export function useUpsertSofaToday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: { stay_id: string } & Record<string, number | null | string>) => {
      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase
        .from('sofa_assessments')
        .upsert({ ...row, assessed_on: today }, { onConflict: 'stay_id,assessed_on' })
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}
