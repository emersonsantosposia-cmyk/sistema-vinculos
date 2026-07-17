import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireAdmin,
  validatePerfilPayload,
} from "@/lib/supabase/perfis-server";
import { friendlyError } from "@/lib/supabase/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
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
    requireSenha: false,
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

  const { data: atual, error: loadError } = await adminClient
    .from("perfis_usuario")
    .select("id, email")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !atual) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 },
    );
  }

  if (atual.email !== data.email) {
    const { error: emailError } = await adminClient.auth.admin.updateUserById(
      id,
      {
        email: data.email,
        email_confirm: true,
        user_metadata: {
          full_name: data.nome,
          name: data.nome,
        },
      },
    );
    if (emailError) {
      return NextResponse.json(
        {
          error: friendlyError(
            emailError.message,
            "Erro ao atualizar e-mail no Auth.",
          ),
        },
        { status: 400 },
      );
    }
  } else {
    await adminClient.auth.admin.updateUserById(id, {
      user_metadata: {
        full_name: data.nome,
        name: data.nome,
      },
    });
  }

  const { error: updateError } = await adminClient
    .from("perfis_usuario")
    .update({
      nome: data.nome,
      matricula: data.matricula,
      cpf: data.cpf,
      email: data.email,
      role: data.role,
      unidade: data.unidade,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      {
        error: friendlyError(updateError.message, "Erro ao atualizar perfil."),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
