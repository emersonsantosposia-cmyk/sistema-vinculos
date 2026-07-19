import Link from "next/link";
import { EntityIcon } from "@/components/dashboard/EntityIcons";
import { DASHBOARD_ENTITIES, type DashboardEntityCount } from "@/lib/dashboard";

export function EntityKpiCards({
  entities,
}: {
  entities: DashboardEntityCount[];
}) {
  return (
    <section aria-label="Acesso às entidades">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {entities.map((entity) => (
          <Link
            key={entity.key}
            href={entity.href}
            className="group relative overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-4 py-4 transition-[border-color,box-shadow,background-color] hover:border-[color:var(--dash-gold)] hover:bg-[color:var(--dash-panel-hover)] hover:shadow-[0_0_0_1px_var(--cor-borda-destaque),var(--cor-sombra-dropdown)]"
          >
            <div className="flex items-start justify-between gap-3">
              <EntityIcon
                entityKey={entity.key}
                className="h-6 w-6 text-[color:var(--dash-gold)] transition-[filter,color] group-hover:text-[color:var(--dash-gold-bright)] group-hover:drop-shadow-[0_0_6px_var(--cor-borda-destaque)]"
              />
              <span className="text-[10px] tracking-[0.18em] text-[color:var(--dash-muted)] uppercase">
                Total
              </span>
            </div>
            <p className="mt-3 font-bold text-3xl tracking-tight text-[color:var(--dash-gold)] tabular-nums sm:text-4xl">
              {entity.total.toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 text-[11px] font-medium tracking-[0.2em] text-[color:var(--dash-muted-strong)] uppercase">
              {entity.label}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function EntityKpiCardsSkeleton() {
  return (
    <section aria-label="Carregando entidades" aria-busy="true">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_ENTITIES.map((entity) => (
          <div
            key={entity.key}
            className="rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-6 w-6 animate-pulse rounded bg-[color:var(--dash-border)]" />
              <div className="h-3 w-10 animate-pulse rounded bg-[color:var(--dash-border)]" />
            </div>
            <div className="mt-4 h-9 w-16 animate-pulse rounded bg-[color:var(--dash-border)]" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-[color:var(--dash-border)]" />
          </div>
        ))}
      </div>
    </section>
  );
}
