export default function PessoaDetailLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-56 shrink-0 bg-sidebar sm:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-12 border-b border-border bg-panel" />
        <div className="mx-auto w-full max-w-4xl space-y-4 p-5">
          <div className="h-40 animate-pulse rounded border border-border bg-panel-soft" />
          <div className="h-28 animate-pulse rounded border border-border bg-panel-soft" />
          <p className="text-sm text-muted">Carregando pessoa…</p>
        </div>
      </div>
    </div>
  );
}
