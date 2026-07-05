const URL = 'https://zjvkvxaqixztdetwliyp.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqdmt2eGFxaXh6dGRldHdsaXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzAwMzYsImV4cCI6MjA5ODc0NjAzNn0.5t-P1ZK6OCeVMl6b6_UiwW3Z-Uy7ctClb7OjM5sFvfg'

const tables = ['stays', 'sofa_assessments', 'goals', 'antibiotics', 'accesses', 'nutrition', 'unit_events', 'profiles', 'vent_settings', 'blood_gases', 'mrc_assessments', 'emr_sessions']

for (const t of tables) {
  const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  const body = await r.text()
  console.log(`${t}: HTTP ${r.status} ${r.status === 200 ? 'OK (tabla existe, RLS activa)' : body.slice(0, 120)}`)
}
