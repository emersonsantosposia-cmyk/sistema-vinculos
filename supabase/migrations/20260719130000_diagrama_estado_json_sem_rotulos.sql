-- Remove títulos/nomes/fotos/rótulos cacheados de estado_json legados (v1)
-- e normaliza para a versão estrutural (v2).
-- Campos preservados por nó: id, type, position, data.{entidadeTipo, entidadeId,
-- expanded, isRoot, refSources}. Arestas: id, source, target, type, data.refSources.

UPDATE public.diagrama_visualizacoes_salvas
SET estado_json = jsonb_build_object(
  'version', 2,
  'root', COALESCE(estado_json->'root', '{}'::jsonb),
  'pinnedNodeIds', COALESCE(estado_json->'pinnedNodeIds', '[]'::jsonb),
  'nodes', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n->>'id',
          'type', 'entidade',
          'position', COALESCE(n->'position', '{"x":0,"y":0}'::jsonb),
          'data', jsonb_build_object(
            'entidadeTipo', n->'data'->>'entidadeTipo',
            'entidadeId', n->'data'->>'entidadeId',
            'expanded', COALESCE((n->'data'->>'expanded')::boolean, false),
            'isRoot', COALESCE((n->'data'->>'isRoot')::boolean, false),
            'refSources', COALESCE(n->'data'->'refSources', '[]'::jsonb)
          )
        )
        ORDER BY ord
      )
      FROM jsonb_array_elements(COALESCE(estado_json->'nodes', '[]'::jsonb))
        WITH ORDINALITY AS t(n, ord)
      WHERE n->>'type' = 'entidade'
        AND n->'data'->>'entidadeTipo' IS NOT NULL
        AND n->'data'->>'entidadeId' IS NOT NULL
    ),
    '[]'::jsonb
  ),
  'edges', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', e->>'id',
          'source', e->>'source',
          'target', e->>'target',
          'type', 'straight',
          'data', jsonb_build_object(
            'refSources', COALESCE(e->'data'->'refSources', '[]'::jsonb)
          )
        )
        ORDER BY ord
      )
      FROM jsonb_array_elements(COALESCE(estado_json->'edges', '[]'::jsonb))
        WITH ORDINALITY AS t(e, ord)
      WHERE e->>'id' IS NOT NULL
        AND e->>'source' IS NOT NULL
        AND e->>'target' IS NOT NULL
    ),
    '[]'::jsonb
  )
)
WHERE estado_json IS NOT NULL;

COMMENT ON COLUMN public.diagrama_visualizacoes_salvas.estado_json IS
  'Snapshot estrutural do diagrama (v2): tipo/id/posição/pins/expansão — sem '
  'títulos, nomes ou fotos de entidades (sempre resolvidos ao vivo via RLS).';
