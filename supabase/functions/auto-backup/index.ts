// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BACKUPS = 30;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenantId } = await req.json();
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenantId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Busca todos os dados do tenant ────────────────────────────────────────

    const byTenant = async (table: string) => {
      const { data, error } = await supabaseAdmin
        .from(table).select("*").eq("tenant_id", tenantId).limit(10000);
      if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`);
      return data ?? [];
    };

    const byIds = async (table: string, col: string, ids: string[]) => {
      if (!ids.length) return [];
      const { data, error } = await supabaseAdmin
        .from(table).select("*").in(col, ids).limit(10000);
      if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`);
      return data ?? [];
    };

    const [
      institutions, courses, product_categories, users, activity_types,
      funnels, products, classes,
      clients, events, cs_actions, cs_daily_services,
      product_negotiations, sales, client_tasks,
      class_products, class_timeline_events, client_activities,
      event_activities, cs_action_activities,
    ] = await Promise.all([
      byTenant("institutions"), byTenant("courses"), byTenant("product_categories"),
      byTenant("users"), byTenant("activity_types"),
      byTenant("funnels"), byTenant("products"), byTenant("classes"),
      byTenant("clients"), byTenant("events"), byTenant("cs_actions"),
      byTenant("cs_daily_services"), byTenant("product_negotiations"),
      byTenant("sales"), byTenant("client_tasks"),
      byTenant("class_products"), byTenant("class_timeline_events"),
      byTenant("client_activities"), byTenant("event_activities"),
      byTenant("cs_action_activities"),
    ]);

    const [funnel_stages, funnel_responsible_users, class_courses] = await Promise.all([
      byIds("funnel_stages",            "funnel_id", funnels.map((f: any) => f.id)),
      byIds("funnel_responsible_users", "funnel_id", funnels.map((f: any) => f.id)),
      byIds("class_courses",            "class_id",  classes.map((c: any) => c.id)),
    ]);

    const exportedAt = new Date().toISOString();
    const json = JSON.stringify({
      version: "2.0",
      exportedAt,
      tenantId,
      tables: {
        institutions, courses, product_categories, users, activity_types,
        funnels, funnel_stages, funnel_responsible_users,
        products, classes, class_courses, class_products, class_timeline_events,
        clients, client_activities,
        events, event_activities,
        cs_actions, cs_action_activities, cs_daily_services,
        product_negotiations, sales, client_tasks,
      },
    });

    // ── Salva no Storage ──────────────────────────────────────────────────────

    // Formato: backup_YYYY-MM-DD_HH-mm.json
    const ts = exportedAt.slice(0, 16).replace("T", "_").replace(/:/g, "-");
    const filename = `backup_${ts}.json`;
    const storagePath = `${tenantId}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("backups")
      .upload(storagePath, new Blob([json], { type: "application/json" }), {
        upsert: false,
        contentType: "application/json",
      });

    if (uploadError) throw new Error(`Erro ao salvar backup: ${uploadError.message}`);

    // ── Mantém apenas os últimos MAX_BACKUPS ──────────────────────────────────

    const { data: files, error: listError } = await supabaseAdmin.storage
      .from("backups")
      .list(tenantId, { sortBy: { column: "created_at", order: "asc" } });

    if (!listError && files && files.length > MAX_BACKUPS) {
      const toDelete = files
        .slice(0, files.length - MAX_BACKUPS)
        .map((f: any) => `${tenantId}/${f.name}`);
      await supabaseAdmin.storage.from("backups").remove(toDelete);
    }

    // ── Atualiza last_backup_at em backup_settings ────────────────────────────

    await supabaseAdmin.from("backup_settings").upsert(
      { tenant_id: tenantId, last_backup_at: exportedAt },
      { onConflict: "tenant_id" }
    );

    const sizeKb = Math.round(json.length / 1024);

    return new Response(
      JSON.stringify({ success: true, filename, sizeKb, exportedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("auto-backup error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
