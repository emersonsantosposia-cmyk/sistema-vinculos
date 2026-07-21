type InstitutionalBannerProps = {
  className?: string;
};

/**
 * Faixa institucional: arte completa (Rede Lince · texto · PPF).
 */
export function InstitutionalBanner({ className = "" }: InstitutionalBannerProps) {
  return (
    <div
      className={`relative aspect-[1024/262] w-full overflow-hidden bg-[color:var(--cor-fundo-primaria)] ${className}`}
      role="img"
      aria-label="Rede Lince — Sistema de contrainteligência · PPF"
    >
      <img
        src="/rede-lince-institucional.png"
        alt=""
        width={1024}
        height={262}
        className="absolute inset-0 h-full w-full object-contain object-center"
        aria-hidden
      />
    </div>
  );
}
