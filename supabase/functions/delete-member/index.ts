// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id obrigatório");

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error("Não autenticado");

    if (userData.user.id === user_id)
      throw new Error("Você não pode excluir a si mesmo.");

    const admin = createClient(url, service);
    const { data: me } = await admin
      .from("profiles")
      .select("role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!me || me.role !== "admin" || !me.is_active)
      throw new Error("Sem permissão");

    // remove profile (cascade remove dependências)
    await admin.from("profiles").delete().eq("id", user_id);

    // remove o usuário do auth
    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});