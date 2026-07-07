-- UCI Control — Cambios Arteaga sub-proyecto A: destino estructurado + comorbilidades
-- destination (texto libre existente) NO se toca: pasa a ser el "detalle" en la UI.
alter table public.stays
  add column comorbilidades text not null default '',
  add column destino_tipo text not null default '';
