import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env — veja .env.example"
  );
}

export const supabase = createClient(url || "http://localhost", anonKey || "missing", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // lê o token do link de confirmação / recuperação de senha
  },
});
