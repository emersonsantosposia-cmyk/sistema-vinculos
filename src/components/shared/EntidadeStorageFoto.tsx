"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/Form";
import { createClient } from "@/lib/supabase/client";

type Props = {
  bucket: string;
  path: string | null;
  alt?: string;
};

/** Preview retangular de foto em bucket privado (signed URL). */
export function EntidadeStorageFoto({
  bucket,
  path,
  alt = "Foto",
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setFailed(false);
      setUrl(null);

      if (!path) {
        setLoading(false);
        return;
      }
      if (/^https?:\/\//i.test(path)) {
        setUrl(path);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (cancelled) return;
      if (!error && data?.signedUrl) {
        setUrl(data.signedUrl);
      } else {
        setFailed(true);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [bucket, path]);

  if (!path) {
    return <EmptyState>Nenhuma foto cadastrada.</EmptyState>;
  }

  if (loading) {
    return (
      <div className="flex h-48 w-full max-w-sm items-center justify-center rounded border border-border bg-panel-soft text-xs text-muted">
        Carregando foto…
      </div>
    );
  }

  if (failed || !url) {
    return (
      <EmptyState>
        Não foi possível carregar a foto. Verifique se o arquivo ainda existe no
        armazenamento.
      </EmptyState>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="h-48 w-full max-w-sm rounded border border-border object-cover bg-panel-soft"
      onError={() => setFailed(true)}
    />
  );
}
