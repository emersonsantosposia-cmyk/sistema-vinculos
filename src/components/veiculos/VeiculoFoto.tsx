"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/Form";
import { createClient } from "@/lib/supabase/client";

type Props = {
  path: string | null;
  alt?: string;
};

export function VeiculoFoto({ path, alt = "Foto do veículo" }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
        .from("fotos-veiculos")
        .createSignedUrl(path, 3600);

      if (cancelled) return;
      if (!error && data?.signedUrl) setUrl(data.signedUrl);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) {
    return <EmptyState>Nenhuma foto cadastrada.</EmptyState>;
  }

  if (loading || !url) {
    return (
      <div className="flex h-48 w-full max-w-sm items-center justify-center rounded border border-border bg-panel-soft text-xs text-muted">
        Carregando foto…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="h-48 w-full max-w-sm rounded border border-border object-cover bg-panel-soft"
    />
  );
}
