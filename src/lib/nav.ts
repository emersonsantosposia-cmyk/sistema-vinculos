export const NAV_ITEMS: {
  href: string;
  label: string;
  disabled?: boolean;
  /** Visível apenas para role administrador ativo. */
  adminOnly?: boolean;
}[] = [
  { href: "/", label: "Dashboard" },
  { href: "/pessoas", label: "Pessoas" },
  { href: "/enderecos", label: "Endereços" },
  { href: "/comunicacoes", label: "Comunicações" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/empresas", label: "Empresas" },
  { href: "/orcrims", label: "Orcrims" },
  { href: "/documentos", label: "Documentos" },
  { href: "/casos", label: "Casos" },
  { href: "/usuarios", label: "Usuários", adminOnly: true },
  { href: "/auditoria", label: "Auditoria", adminOnly: true },
];
