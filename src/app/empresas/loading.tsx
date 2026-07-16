export default function Loading() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-56 shrink-0 bg-sidebar" />
      <div className="flex flex-1 flex-col">
        <div className="h-12 border-b border-border bg-panel" />
        <div className="space-y-3 p-5">
          <div className="h-8 w-64 animate-pulse rounded bg-panel-hover" />
          <div className="h-56 animate-pulse rounded border border-border bg-panel-soft" />
          <p className="text-sm text-muted">Carregando…</p>
        </div>
      </div>
    </div>
  );
}
