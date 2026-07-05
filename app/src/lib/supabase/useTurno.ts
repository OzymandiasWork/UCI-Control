import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './client'
import type { ShiftStaff } from './types'

const key = (date: string, type: string) => ['turno', date, type]

export function useTurno(date: string, type: 'Día' | 'Noche') {
  return useQuery({
    queryKey: key(date, type),
    queryFn: async (): Promise<ShiftStaff[]> => {
      const { data, error } = await supabase
        .from('shift_staff').select('*')
        .eq('shift_date', date).eq('shift_type', type)
        .order('role').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useTurnoMutations(date: string, type: 'Día' | 'Noche') {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['turno'] })
  return {
    add: useMutation({
      mutationFn: async (role: string) => {
        const { error } = await supabase.from('shift_staff')
          .insert({ shift_date: date, shift_type: type, role })
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<ShiftStaff> }) => {
        const { error } = await supabase.from('shift_staff').update(patch).eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('shift_staff').delete().eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
  }
}

export function useOccupancyTrend() {
  return useQuery({
    queryKey: ['occupancy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('occupancy_snapshots').select('*')
        .order('snap_date', { ascending: false }).limit(14)
      if (error) throw error
      return data.reverse()
    },
  })
}
