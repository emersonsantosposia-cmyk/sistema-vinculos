function Ring({
  value,
  label,
  detail,
}: {
  value: number | null;
  label: string;
  detail: string;
}) {
  const pct = value ?? 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(pct, 0), 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-5 py-5">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90">
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke="var(--cor-chart-gauge-track)"
            strokeWidth="8"
          />
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke="var(--dash-gold)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={value === null ? circumference : offset}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-xl text-[color:var(--dash-gold)] tabular-nums">
            {value === null ? "—" : `${pct.toLocaleString("pt-BR")}%`}
          </span>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] font-medium tracking-[0.18em] text-[color:var(--dash-muted-strong)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-center text-[11px] text-[color:var(--dash-muted)]">
        {detail}
      </p>
    </div>
  );
}

export function DashboardGauges({
  pessoasPresasPct,
  comunicacoesAtivasPct,
}: {
  pessoasPresasPct: number | null;
  comunicacoesAtivasPct: number | null;
}) {
  return (
    <section aria-label="Indicadores de proporção">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.18em] text-[color:var(--dash-gold)] uppercase">
            Proporções
          </h2>
          <p className="mt-1 text-xs text-[color:var(--dash-muted)]">
            Indicadores relativos sobre o total cadastrado
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Ring
          value={pessoasPresasPct}
          label="Pessoas — Preso"
          detail="Tipo preso / total de pessoas"
        />
        <Ring
          value={comunicacoesAtivasPct}
          label="Comunicações ativas"
          detail="Status ativo / total de comunicações"
        />
      </div>
    </section>
  );
}
