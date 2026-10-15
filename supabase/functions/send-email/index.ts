// Edge Function: e-mails transacionais via Resend (ex.: "acesso aprovado")
// Os e-mails de Auth (confirmar cadastro / redefinir senha) NÃO passam por aqui:
// eles saem pelo SMTP do Resend configurado no painel do Supabase.
//
// Deploy:  supabase functions deploy send-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM="Dara <no-reply@seudominio.com.br>" APP_URL=https://app.seudominio.com.br
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    // 1) Quem chama precisa ser ADMIN ativo (checado com o JWT do próprio usuário + RLS)
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: adminErr } = await asUser.rpc("is_admin");
    if (adminErr || !isAdmin) return json({ error: "forbidden" }, 403);

    const { type, user_id } = await req.json();
    if (type !== "access_approved" || !user_id) return json({ error: "bad_request" }, 400);

    // 2) Busca o destinatário
    const { data: target, error: tErr } = await asUser
      .from("profiles")
      .select("name, email, is_active")
      .eq("id", user_id)
      .single();
    if (tErr || !target?.is_active) return json({ error: "user_not_found_or_inactive" }, 404);

    // 3) Envia pelo Resend
    const appUrl = Deno.env.get("APP_URL") ?? "";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("MAIL_FROM"),
        to: [target.email],
        subject: "Seu acesso à Dara foi liberado",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111">
            <h2 style="letter-spacing:4px;margin:0 0 4px">DARA</h2>
            <p style="font-size:11px;letter-spacing:3px;color:#777;margin:0 0 24px">AUDIOVISUAL</p>
            <p>Olá, ${escapeHtml(target.name)}!</p>
            <p>Seu acesso ao sistema foi liberado. Já pode entrar com o seu e-mail e senha.</p>
            <p><a href="${appUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Acessar o sistema</a></p>
          </div>`,
      }),
    });

    if (!res.ok) return json({ error: "resend_failed", detail: await res.text() }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
