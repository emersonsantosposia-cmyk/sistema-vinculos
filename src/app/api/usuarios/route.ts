import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireAdmin,
  validatePerfilPayload,
} from "@/lib/supabase/perfis-server";
import { friendlyError } from "@/lib/supabase/errors";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const validated = validatePerfilPayload({
    nome: String(body.nome ?? ""),
    matricula: String(body.matricula ?? ""),
    cpf: String(body.cpf ?? ""),
    email: String(body.email ?? ""),
    role: String(body.role ?? ""),
    unidade: body.unidade == null ? null : String(body.unidade),
    senha: String(body.senha ?? ""),
    requireSenha: true,
  });

  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { data } = validated;
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de configuração.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: created, error: createAuthError } =
    await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.senha!,
      email_confirm: true,
      user_metadata: {
        full_name: data.nome,
        name: data.nome,
      },
    });

  if (createAuthError || !created.user) {
    return NextResponse.json(
      {
        error: friendlyError(
          createAuthError?.message ?? "",
          "Erro ao criar usuário no Auth.",
        ),
      },
      { status: 400 },
    );
  }

  const userId = created.user.id;
  const { error: perfilError } = await adminClient.from("perfis_usuario").insert({
    id: userId,
    nome: data.nome,
    matricula: data.matricula,
    cpf: data.cpf,
    email: data.email,
    role: data.role,
    unidade: data.unidade,
    ativo: true,
    usuario_cadastro: admin.userId,
  });

  if (perfilError) {
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json(
      {
        error: friendlyError(
          perfilError.message,
          "Erro ao criar perfil. Usuário Auth foi revertido.",
        ),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: userId }, { status: 201 });
}
