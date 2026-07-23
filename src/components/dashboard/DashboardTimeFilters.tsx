"use client";

import {
  DASHBOARD_MONTH_OPTIONS,
  DASHBOARD_TIME_TUDO,
  listDashboardYears,
  normalizeTimeFilter,
  type DashboardTimeFilter,
} from "@/lib/dashboard";

const YEARS = listDashboardYears(2020);

/** Filtro Tudo / Ano / Mês compartilhado pelo painel e pelos gráficos. */
export function DashboardTimeFilters({
  value,
  onChange,
  disabled,
}: {
  value: DashboardTimeFilter;
  onChange: (next: DashboardTimeFilter) => void;
  disabled?: boolean;
}) {
  const tudoActive = value.scope === "tudo";
  const selectClass =
    "h-11 min-h-[44px] w-full min-w-0 rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-2 text-xs tracking-normal text-[color:var(--dash-gold)] normal-case outline-none focus:border-[color:var(--dash-gold)] disabled:opacity-60 sm:h-auto sm:min-h-0 sm:min-w-[5.5rem] sm:w-auto sm:py-1.5";

  return (
    <div
      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
      role="group"
      aria-label="Filtro de período"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(DASHBOARD_TIME_TUDO)}
        className={`inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded border px-3 text-[11px] tracking-[0.14em] uppercase transition-colors disabled:opacity-60 sm:h-auto sm:min-h-0 sm:w-auto sm:py-1.5 ${
          tudoActive
            ? "border-[color:var(--dash-gold)] bg-[color:var(--dash-gold)] font-semibold text-gold-ink"
            : "border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] text-[color:var(--dash-muted-strong)] hover:border-[color:var(--dash-gold)] hover:text-[color:var(--dash-gold)]"
        }`}
      >
        Tudo
      </button>

      <div className="grid grid-cols-2 gap-2 sm:contents">
        <label className="flex min-w-0 flex-col gap-1 text-[11px] tracking-[0.12em] text-[color:var(--dash-muted)] uppercase sm:flex-row sm:items-center sm:gap-2">
          Ano
          <select
            disabled={disabled}
            value={value.year ?? ""}
            onChange={(e) => {
              const year = e.target.value ? Number(e.target.value) : null;
              if (!year) {
                onChange(DASHBOARD_TIME_TUDO);
                return;
              }
              onChange(
                normalizeTimeFilter({
                  year,
                  month: value.month,
                }),
              );
            }}
            className={selectClass}
          >
            <option value="">—</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-[11px] tracking-[0.12em] text-[color:var(--dash-muted)] uppercase sm:flex-row sm:items-center sm:gap-2">
          Mês
          <select
            disabled={disabled || value.year == null}
            value={value.month ?? ""}
            onChange={(e) => {
              const month = e.target.value ? Number(e.target.value) : null;
              if (!value.year) return;
              onChange(
                normalizeTimeFilter({
                  year: value.year,
                  month,
                }),
              );
            }}
            className={`${selectClass} sm:min-w-[7.5rem]`}
          >
            <option value="">—</option>
            {DASHBOARD_MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
