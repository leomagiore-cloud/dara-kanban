// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, role } = await req.json();
    if (!email) throw new Error("E-mail obrigatório");

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Confere se quem chamou é admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error("Não autenticado");

    const admin = createClient(url, service);
    const { data: me } = await admin
      .from("profiles")
      .select("role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!me || me.role !== "admin" || !me.is_active) throw new Error("Sem permissão");

    // Cria o usuário convidado já ativo, com a role definida
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name: email.split("@")[0] },
    });
    if (error) throw error;

    // O trigger `handle_new_user` cria o profile, mas garantimos role/is_active
    if (data?.user?.id) {
      await admin.from("profiles").update({ role, is_active: true }).eq("id", data.user.id);
    }

    return new Response(JSON.stringify({ ok: true, user_id: data?.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});