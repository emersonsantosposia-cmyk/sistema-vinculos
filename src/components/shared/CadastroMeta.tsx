import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

async function resolveUsuarioNome(
  usuarioId: string | null | undefined,
): Promise<string | null> {
  if (!usuarioId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_display_names", {
    ids: [usuarioId],
  });

  if (!error && Array.isArray(data) && data.length > 0) {
    const row = data[0] as { id: string; display_name: string };
    if (row.display_name?.trim()) return row.display_name.trim();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === usuarioId) {
    return (
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      user.email ||
      "Você"
    );
  }

  return `Usuário ${usuarioId.slice(0, 8)}`;
}

/** Rodapé dos dados cadastrais: data + nome de quem cadastrou (fonte menor). */
export async function CadastroMeta({
  dataCadastro,
  usuarioCadastroId,
}: {
  dataCadastro: string;
  usuarioCadastroId: string | null | undefined;
}) {
  const usuarioNome = await resolveUsuarioNome(usuarioCadastroId);
  const data = formatDate(dataCadastro);

  return (
    <div className="sm:col-span-2 border-t border-border pt-3">
      <p className="text-xs leading-relaxed text-muted">
        <span className="font-medium tracking-wide uppercase">
          Data de cadastro
        </span>
        <span className="mx-1.5 text-muted/60">·</span>
        <span>{data}</span>
        {usuarioNome ? (
          <>
            <span className="mx-1.5 text-muted/60">·</span>
            <span>
              por <span className="text-muted-strong">{usuarioNome}</span>
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
