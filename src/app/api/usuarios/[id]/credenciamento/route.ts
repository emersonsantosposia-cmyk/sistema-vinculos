import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BAN_DURATION_DESCREDENCIADO,
  requireAdmin,
} from "@/lib/supabase/perfis-server";
import { friendlyError } from "@/lib/supabase/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: { ativo?: boolean };
  try {
    body = (await request.json()) as { ativo?: boolean };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (typeof body.ativo !== "boolean") {
    return NextResponse.json(
      { error: "Informe ativo: true ou false." },
      { status: 400 },
    );
  }

  if (!body.ativo && id === admin.userId) {
    return NextResponse.json(
      {
        error:
          "Você não pode descredenciar a própria conta. Peça a outro administrador.",
      },
      { status: 400 },
    );
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
    .select("id, ativo")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !alvo) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 },
    );
  }

  const { error: perfilError } = await adminClient
    .from("perfis_usuario")
    .update({ ativo: body.ativo })
    .eq("id", id);

  if (perfilError) {
    return NextResponse.json(
      {
        error: friendlyError(
          perfilError.message,
          "Erro ao atualizar credenciamento.",
        ),
      },
      { status: 400 },
    );
  }

  const { error: banError } = await adminClient.auth.admin.updateUserById(id, {
    ban_duration: body.ativo ? "none" : BAN_DURATION_DESCREDENCIADO,
  });

  if (banError) {
    // Reverte perfil se o ban/unban falhar
    await adminClient
      .from("perfis_usuario")
      .update({ ativo: alvo.ativo })
      .eq("id", id);

    return NextResponse.json(
      {
        error: friendlyError(
          banError.message,
          "Erro ao atualizar bloqueio de login no Auth.",
        ),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    ativo: body.ativo,
  });
}
