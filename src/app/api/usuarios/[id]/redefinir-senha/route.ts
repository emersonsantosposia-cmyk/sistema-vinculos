import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateTempPassword,
  requireAdmin,
} from "@/lib/supabase/perfis-server";
import { friendlyError } from "@/lib/supabase/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de configuração.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: alvo, error: loadError } = await adminClient
    .from("perfis_usuario")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !alvo) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 },
    );
  }

  const senhaTemporaria = generateTempPassword(14);
  const { error: pwdError } = await adminClient.auth.admin.updateUserById(id, {
    password: senhaTemporaria,
  });

  if (pwdError) {
    return NextResponse.json(
      {
        error: friendlyError(
          pwdError.message,
          "Erro ao redefinir senha no Auth.",
        ),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ senhaTemporaria });
}
