import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './client'
import type { UnitEvent } from './types'

const EVENTS_KEY = ['events']

export function useEvents() {
  return useQuery({
    queryKey: EVENTS_KEY,
    queryFn: async (): Promise<UnitEvent[]> => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('unit_events').select('*').eq('event_date', today).order('time')
      if (error) throw error
      return data
    },
  })
}

export function useEventMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: EVENTS_KEY })
  return {
    add: useMutation({
      mutationFn: async (row: { time: string; label: string }) => {
        const { error } = await supabase.from('unit_events').insert(row)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('unit_events').delete().eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
  }
}
