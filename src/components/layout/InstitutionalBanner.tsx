type InstitutionalBannerProps = {
  className?: string;
};

/**
 * Faixa institucional: arte completa (Rede Lince · texto · PPF).
 * Arte nativa 3840×1080 (UHD ultrawide, proporção 32:9).
 */
export function InstitutionalBanner({ className = "" }: InstitutionalBannerProps) {
  return (
    <div
      className={`relative aspect-[32/9] w-full overflow-hidden bg-[color:var(--cor-fundo-primaria)] ${className}`}
      role="img"
      aria-label="Rede Lince — Sistema de contrainteligência · PPF"
    >
      <img
        src="/rede-lince-institucional.png"
        alt=""
        width={3840}
        height={1080}
        className="absolute inset-0 h-full w-full object-contain object-center"
        aria-hidden
      />
    </div>
  );
}
