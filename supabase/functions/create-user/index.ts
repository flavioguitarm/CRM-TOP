// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Valida JWT do chamador ────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente com anon key para validar o token do chamador
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Verifica que o chamador é ADMIN na tabela users ───────────────────
    // Cliente com service_role para ler sem restrição de RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: callerRow, error: callerError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerError || !callerRow) {
      return new Response(
        JSON.stringify({ error: "Usuário chamador não encontrado na tabela users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (callerRow.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem criar novos usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Lê org_id do chamador em user_organizations ───────────────────────
    const { data: orgRow, error: orgError } = await supabaseAdmin
      .from("user_organizations")
      .select("org_id")
      .eq("user_id", caller.id)
      .single();

    // org_id pode não existir ainda (arquitetura em transição) — usa caller.id como fallback
    const orgId = orgRow?.org_id ?? caller.id;

    // ── 4. Valida body ───────────────────────────────────────────────────────
    const { email, password, name, phone, role } = await req.json();

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: email, password, name, role." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validRoles = ["ADMIN", "GESTOR", "CONSULTOR", "VISUALIZADOR"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Role inválido. Valores aceitos: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Cria usuário no Supabase Auth ─────────────────────────────────────
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // confirma o email automaticamente (sem precisar clicar no link)
    });

    if (createError) {
      // Mensagem amigável para email já cadastrado
      const msg = createError.message.includes("already been registered")
        ? "Este e-mail já está cadastrado no sistema."
        : createError.message;
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newAuthId = authData.user.id;

    // ── 6. Insere na tabela public.users ─────────────────────────────────────
    const { error: insertUserError } = await supabaseAdmin
      .from("users")
      .insert({
        id:        newAuthId,   // mesmo UUID do Auth
        tenant_id: orgId,
        name,
        email,
        phone:     phone ?? "",
        role,
        password:  "",          // senha gerenciada pelo Auth — não armazenar aqui
        status:    "ATIVO",
      });

    if (insertUserError) {
      // Rollback: remove do Auth se o insert na tabela falhar
      await supabaseAdmin.auth.admin.deleteUser(newAuthId);
      return new Response(
        JSON.stringify({ error: `Erro ao salvar usuário: ${insertUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 7. Insere em user_organizations ─────────────────────────────────────
    // Só executa se a tabela user_organizations existir (arquitetura pode estar em transição)
    const { error: insertOrgError } = await supabaseAdmin
      .from("user_organizations")
      .insert({
        user_id:        newAuthId,
        org_id:         orgId,
        is_super_admin: false,
      });

    if (insertOrgError) {
      // Não é fatal — loga mas não faz rollback (tabela pode não existir ainda)
      console.warn("user_organizations insert:", insertOrgError.message);
    }

    // ── 8. Retorna o usuário criado ───────────────────────────────────────────
    return new Response(
      JSON.stringify({
        id:     newAuthId,
        email,
        name,
        phone:  phone ?? "",
        role,
        status: "ATIVO",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("create-user unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
