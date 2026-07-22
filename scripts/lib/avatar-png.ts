import { deflateSync } from "zlib";

const AVATAR_COLORS = [
  [61, 90, 128],
  [238, 108, 77],
  [152, 193, 217],
  [41, 50, 65],
  [92, 77, 122],
  [42, 157, 143],
  [231, 111, 81],
  [38, 70, 83],
] as const;

function initialsFromNome(nome: string | null | undefined, fallback: string): string {
  const parts = (nome ?? "")
    .replace(/\[TESTE\]/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return fallback.slice(0, 2).toUpperCase();
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
  return (letters || fallback.slice(0, 2)).toUpperCase();
}

function colorForSeed(seed: string): readonly [number, number, number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** PNG RGB sólido (sem dependências externas). */
function buildSolidPng(
  rgb: readonly [number, number, number],
  size = 256,
): Buffer {
  const [r, g, b] = rgb;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => Buffer.from(row)));
  const compressed = deflateSync(raw);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Gera PNG de avatar.
 * Tenta ui-avatars (iniciais); se a rede falhar, usa cor sólida determinística.
 */
export async function buildAvatarPng(
  seed: string,
  nome: string | null | undefined,
): Promise<Buffer> {
  const initials = initialsFromNome(nome, seed);
  const [r, g, b] = colorForSeed(seed);
  const bg = `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  const url =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}` +
    `&size=256&background=${bg}&color=ffffff&bold=true&format=png`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const ctype = res.headers.get("content-type") ?? "";
      if (ctype.includes("png") || ctype.includes("octet-stream")) {
        return Buffer.from(await res.arrayBuffer());
      }
    }
  } catch {
    // fallback local
  }

  return buildSolidPng([r, g, b]);
}

/** Versão síncrona só com cor sólida (útil em loops sem await). */
export function buildAvatarPngSync(seed: string): Buffer {
  return buildSolidPng(colorForSeed(seed));
}
