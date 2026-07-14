"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Gera signed URLs para paths do Storage (bucket privado).
 * Retorna mapa path → signedUrl.
 */
export function useSignedStorageUrls(
  bucket: string,
  paths: Array<string | null | undefined>,
  expiresIn = 3600,
): { urls: Record<string, string>; loading: boolean } {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const uniqueKey = paths
    .filter((p): p is string => Boolean(p))
    .sort()
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const unique = uniqueKey ? uniqueKey.split("|") : [];

    async function load() {
      if (unique.length === 0) {
        setUrls({});
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(unique, expiresIn);

      if (cancelled) return;

      const map: Record<string, string> = {};
      if (!error && data) {
        for (const item of data) {
          if (item.path && item.signedUrl) {
            map[item.path] = item.signedUrl;
          }
        }
      }
      setUrls(map);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [bucket, uniqueKey, expiresIn]);

  return { urls, loading };
}

export function useSignedStorageUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn = 3600,
): { url: string | null; loading: boolean } {
  const { urls, loading } = useSignedStorageUrls(
    bucket,
    path ? [path] : [],
    expiresIn,
  );
  return { url: path ? (urls[path] ?? null) : null, loading: Boolean(path) && loading };
}
