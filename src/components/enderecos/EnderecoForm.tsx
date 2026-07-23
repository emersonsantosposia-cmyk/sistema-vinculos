"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, FormActions, Input, Label, Select } from "@/components/ui/Form";
import { MapPicker } from "@/components/maps/MapComponents";
import {
  geocodeEndereco,
  labelGeocodePrecisao,
} from "@/lib/geocode";
import { maskCepInput, UFS } from "@/lib/format";
import {
  createEndereco,
  updateEndereco,
  uploadFotoEndereco,
} from "@/lib/supabase/enderecos";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";
import { fetchViaCep } from "@/lib/viacep";
import type { Endereco, GeocodePrecisao } from "@/lib/types";

function parseCoord(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  initial?: Endereco;
};

export function EnderecoForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cepLoading, setCepLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [cepHint, setCepHint] = useState<string | null>(null);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const lastFetchedCep = useRef<string>(
    initial?.cep?.replace(/\D/g, "") ?? "",
  );

  const [nome, setNome] = useState(initial?.nome ?? "");
  const [cep, setCep] = useState(
    initial?.cep ? maskCepInput(initial.cep) : "",
  );
  const [logradouro, setLogradouro] = useState(initial?.logradouro ?? "");
  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [bairro, setBairro] = useState(initial?.bairro ?? "");
  const [complemento, setComplemento] = useState(initial?.complemento ?? "");
  const [cidade, setCidade] = useState(initial?.cidade ?? "");
  const [estado, setEstado] = useState(initial?.estado ?? "");
  const [latitude, setLatitude] = useState(
    initial?.latitude != null ? String(initial.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    initial?.longitude != null ? String(initial.longitude) : "",
  );
  const [coordsManuais, setCoordsManuais] = useState(
    initial?.coordenadas_ajustadas_manualmente ?? false,
  );
  const [geocodePrecisao, setGeocodePrecisao] = useState<GeocodePrecisao | null>(
    initial?.geocode_precisao ?? null,
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const { url: existingFotoUrl, loading: existingFotoLoading } =
    useSignedStorageUrl("fotos-enderecos", initial?.foto_url);

  useEffect(() => {
    if (!foto) {
      setFotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setFotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const latNum = parseCoord(latitude);
  const lngNum = parseCoord(longitude);
  const precisaoLabel = labelGeocodePrecisao(geocodePrecisao, coordsManuais);

  function markCoordsManual(lat: number, lng: number) {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    setCoordsManuais(true);
    setGeocodePrecisao(null);
    setGeoHint("Posição ajustada manualmente no mapa.");
  }

  function handleCoordTyped(
    field: "latitude" | "longitude",
    value: string,
  ) {
    if (field === "latitude") setLatitude(value);
    else setLongitude(value);
    // Qualquer edição direta nos campos marca como ajuste manual.
    setCoordsManuais(true);
    setGeocodePrecisao(null);
  }

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8 || digits === lastFetchedCep.current) return;

    setCepLoading(true);
    setCepHint(null);
    const { data, error: viaError } = await fetchViaCep(digits);
    setCepLoading(false);

    if (viaError || !data) {
      setCepHint(viaError ?? "CEP não encontrado.");
      return;
    }

    lastFetchedCep.current = digits;
    setLogradouro(data.logradouro || "");
    setBairro(data.bairro || "");
    setCidade(data.localidade || "");
    setEstado(data.uf || "");
    if (data.complemento) setComplemento(data.complemento);
    setCepHint("Endereço preenchido via ViaCEP.");
  }

  function handleCepChange(value: string) {
    const masked = maskCepInput(value);
    setCep(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length < 8) {
      lastFetchedCep.current = "";
      setCepHint(null);
    }
    if (digits.length === 8) {
      void lookupCep(digits);
    }
  }

  async function geocodeNow(options?: {
    showHint?: boolean;
    /** Botão explícito: sempre consulta de novo. Submit: só se faltar coord. */
    force?: boolean;
  }): Promise<{
    lat: number | null;
    lng: number | null;
    precisao: GeocodePrecisao | null;
    manuais: boolean;
  }> {
    const showHint = options?.showHint ?? true;
    const force = options?.force ?? false;

    const existingLat = parseCoord(latitude);
    const existingLng = parseCoord(longitude);
    if (!force && existingLat != null && existingLng != null) {
      return {
        lat: existingLat,
        lng: existingLng,
        precisao: geocodePrecisao,
        manuais: coordsManuais,
      };
    }

    if (
      force &&
      coordsManuais &&
      existingLat != null &&
      existingLng != null
    ) {
      const ok = window.confirm(
        "As coordenadas atuais foram ajustadas manualmente. Obter novas coordenadas do endereço substituirá esse ajuste. Continuar?",
      );
      if (!ok) {
        return {
          lat: existingLat,
          lng: existingLng,
          precisao: geocodePrecisao,
          manuais: true,
        };
      }
    }

    const hasAddress =
      Boolean(logradouro.trim() || cidade.trim() || cep.replace(/\D/g, "")) &&
      Boolean(cidade.trim() || estado || cep.replace(/\D/g, ""));

    if (!hasAddress) {
      if (showHint) {
        setGeoHint(
          "Informe logradouro/cidade/CEP antes de obter as coordenadas.",
        );
      }
      return { lat: null, lng: null, precisao: null, manuais: coordsManuais };
    }

    setGeoLoading(true);
    if (showHint) setGeoHint("Buscando coordenadas no OpenStreetMap…");
    const { data, error: geoError } = await geocodeEndereco({
      logradouro,
      numero,
      bairro,
      cidade,
      estado,
      cep,
    });
    setGeoLoading(false);

    if (geoError || !data) {
      if (showHint) {
        setGeoHint(
          geoError ??
            "Não foi possível localizar as coordenadas deste endereço automaticamente; você pode ajustar manualmente.",
        );
      }
      return { lat: null, lng: null, precisao: null, manuais: coordsManuais };
    }

    setLatitude(data.latitude.toFixed(6));
    setLongitude(data.longitude.toFixed(6));
    setCoordsManuais(false);
    setGeocodePrecisao(data.precisao);
    if (showHint) {
      const label = labelGeocodePrecisao(data.precisao) ?? "";
      setGeoHint(
        `Coordenadas preenchidas: ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}. ${label}`,
      );
    }
    return {
      lat: data.latitude,
      lng: data.longitude,
      precisao: data.precisao,
      manuais: false,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      setError(null);

      let lat = parseCoord(latitude);
      let lng = parseCoord(longitude);
      let manuais = coordsManuais;
      let precisao = geocodePrecisao;

      if (
        (lat == null || lng == null) &&
        !manuais &&
        (logradouro.trim() || cidade.trim() || cep.replace(/\D/g, ""))
      ) {
        setStatus("Geocodificando endereço…");
        const geo = await geocodeNow({ showHint: true, force: false });
        lat = geo.lat;
        lng = geo.lng;
        manuais = geo.manuais;
        precisao = geo.precisao;
      }

      if (latitude.trim() && lat === null) {
        setStatus(null);
        setError("Latitude inválida.");
        return;
      }
      if (longitude.trim() && lng === null) {
        setStatus(null);
        setError("Longitude inválida.");
        return;
      }

      setStatus(isEdit ? "Atualizando endereço…" : "Salvando endereço…");

      const payload = {
        nome,
        logradouro,
        numero,
        bairro,
        complemento,
        cidade,
        estado,
        cep,
        latitude: lat,
        longitude: lng,
        coordenadas_ajustadas_manualmente: manuais,
        geocode_precisao: manuais ? null : precisao,
      };

      const { data, error: saveError } = isEdit
        ? await updateEndereco(initial!.id, payload)
        : await createEndereco(payload);

      if (saveError || !data) {
        setStatus(null);
        setError(saveError ?? "Erro ao salvar endereço.");
        return;
      }

      if (foto) {
        setStatus("Enviando foto…");
        const { error: uploadError } = await uploadFotoEndereco({
          enderecoId: data.id,
          file: foto,
        });
        if (uploadError) {
          setStatus(null);
          setError(
            `${uploadError} O endereço foi salvo, mas a foto pode estar incompleta.`,
          );
          router.push(`/enderecos/${data.id}`);
          router.refresh();
          return;
        }
      }

      setStatus("Concluído. Redirecionando…");
      router.push(`/enderecos/${data.id}`);
      router.refresh();
    });
  }

  const previewSrc = fotoPreview ?? (foto ? null : existingFotoUrl);

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error ? (
        <div className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {error}
        </div>
      ) : null}
      {pending && status ? (
        <div className="rounded border border-border bg-panel-soft px-3 py-2 text-sm text-muted-strong">
          {status}
        </div>
      ) : null}

      <section className="rounded border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Dados do endereço
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: sede, galpão, residência"
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              onBlur={() => void lookupCep(cep)}
              placeholder="00000-000"
              inputMode="numeric"
              disabled={pending}
            />
            {cepLoading ? (
              <p className="mt-1 text-xs text-muted">Consultando ViaCEP…</p>
            ) : cepHint ? (
              <p
                className={`mt-1 text-xs ${
                  cepHint.includes("preenchido")
                    ? "text-muted"
                    : "text-warning-fg"
                }`}
              >
                {cepHint}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="estado">Estado (UF)</Label>
            <Select
              id="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              disabled={pending}
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input
              id="logradouro"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              value={latitude}
              onChange={(e) => handleCoordTyped("latitude", e.target.value)}
              placeholder="Ex.: -20.469700"
              inputMode="decimal"
              disabled={pending}
            />
          </div>

          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              value={longitude}
              onChange={(e) => handleCoordTyped("longitude", e.target.value)}
              placeholder="Ex.: -54.620100"
              inputMode="decimal"
              disabled={pending}
            />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted">Mapa</p>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || geoLoading}
                onClick={() => void geocodeNow({ showHint: true, force: true })}
              >
                {geoLoading ? "Buscando…" : "Obter coordenadas do endereço"}
              </Button>
            </div>
            {geoHint ? (
              <p
                className={`mb-2 text-xs ${
                  geoHint.startsWith("Coordenadas preenchidas") ||
                  geoHint.startsWith("Posição ajustada") ||
                  geoHint.startsWith("Buscando")
                    ? "text-muted"
                    : "text-warning-fg"
                }`}
              >
                {geoHint}
              </p>
            ) : null}
            <MapPicker
              latitude={latNum}
              longitude={lngNum}
              precisaoLabel={precisaoLabel}
              onChange={markCoordsManual}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="foto">
              Foto
              {isEdit ? " (opcional — substitui a atual)" : ""}
            </Label>
            {isEdit && initial?.foto_url ? (
              <div className="mb-2">
                {existingFotoLoading ? (
                  <div className="flex h-32 w-full max-w-xs items-center justify-center rounded border border-border bg-panel-soft text-xs text-muted">
                    Carregando foto atual…
                  </div>
                ) : previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt="Foto atual do endereço"
                    className="h-32 w-full max-w-xs rounded border border-border object-cover bg-panel-soft"
                  />
                ) : null}
              </div>
            ) : fotoPreview ? (
              <div className="mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoPreview}
                  alt="Pré-visualização da foto"
                  className="h-32 w-full max-w-xs rounded border border-border object-cover bg-panel-soft"
                />
              </div>
            ) : null}
            <Input
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              disabled={pending}
            />
          </div>
        </div>
      </section>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.push(isEdit ? `/enderecos/${initial!.id}` : "/enderecos")
          }
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || cepLoading || geoLoading}>
          {pending
            ? isEdit
              ? "Salvando alterações…"
              : "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Salvar endereço"}
        </Button>
      </FormActions>
    </form>
  );
}
