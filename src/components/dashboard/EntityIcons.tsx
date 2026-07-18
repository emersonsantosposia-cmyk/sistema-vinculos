import type { ReactElement, ReactNode } from "react";
import type { DashboardEntityKey } from "@/lib/dashboard";
import { ENTIDADE_TO_DASHBOARD_KEY } from "@/lib/entidade-visual";
import type { EntidadeTipo } from "@/lib/types";

type IconProps = {
  className?: string;
};

function base(props: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden
    >
      {props.children}
    </svg>
  );
}

export function PessoaIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 19.5c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
      </>
    ),
  });
}

export function EnderecoIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M12 21s-6.5-5.2-6.5-10.2A6.5 6.5 0 0112 4.3a6.5 6.5 0 016.5 6.5C18.5 15.8 12 21 12 21z" />
        <circle cx="12" cy="11" r="2.2" />
      </>
    ),
  });
}

export function ComunicacaoIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <rect x="6" y="3.5" width="12" height="17" rx="2" />
        <path d="M10 17.5h4" />
        <path d="M9 7.5h6M9 10.5h6M9 13.5h4" />
      </>
    ),
  });
}

export function VeiculoIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M4 14.5h16l-1.2-4.2a2 2 0 00-1.9-1.4H7.1a2 2 0 00-1.9 1.4L4 14.5z" />
        <path d="M4 14.5v2.5h2.2M20 14.5v2.5h-2.2" />
        <circle cx="7.5" cy="18.2" r="1.4" />
        <circle cx="16.5" cy="18.2" r="1.4" />
        <path d="M8.5 9l1.2-2.5h4.6L15.5 9" />
      </>
    ),
  });
}

export function EmpresaIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M4.5 20.5h15" />
        <path d="M6 20.5V7.5l5-3 5 3v13" />
        <path d="M10 10.5h2M10 13.5h2M10 16.5h2" />
        <path d="M14.5 12.5H18v8" />
      </>
    ),
  });
}

export function DocumentoIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M8 4.5h6.5L18 8v11.5a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 017 19.5v-13A1.5 1.5 0 018.5 5" />
        <path d="M14.5 4.5V8H18" />
        <path d="M9.5 12h5M9.5 15h5" />
      </>
    ),
  });
}

export function CasoIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M8 7.5h8a2 2 0 012 2v9a2 2 0 01-2 2H8a2 2 0 01-2-2v-9a2 2 0 012-2z" />
        <path d="M9.5 7.5V6a2.5 2.5 0 015 0v1.5" />
        <path d="M9.5 13h5M9.5 16h3" />
      </>
    ),
  });
}

export function OrcrimIcon(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5l3 1.75" />
        <path d="M8.5 16.5h7" />
      </>
    ),
  });
}

const ICONS: Record<DashboardEntityKey, (props: IconProps) => ReactElement> = {
  pessoas: PessoaIcon,
  enderecos: EnderecoIcon,
  comunicacoes: ComunicacaoIcon,
  veiculos: VeiculoIcon,
  empresas: EmpresaIcon,
  orcrims: OrcrimIcon,
  documentos: DocumentoIcon,
  casos: CasoIcon,
};

export function EntityIcon({
  entityKey,
  className,
}: {
  entityKey: DashboardEntityKey;
  className?: string;
}) {
  const Icon = ICONS[entityKey];
  return <Icon className={className} />;
}

export function EntidadeTipoIcon({
  tipo,
  className,
}: {
  tipo: EntidadeTipo;
  className?: string;
}) {
  return (
    <EntityIcon
      entityKey={ENTIDADE_TO_DASHBOARD_KEY[tipo]}
      className={className}
    />
  );
}
