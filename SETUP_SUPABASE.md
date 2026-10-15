# Dara — Configuração Supabase + Resend

## 1. Variáveis de ambiente
Copie `.env.example` para `.env` e preencha com **Project Settings → API**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (chave *anon/publishable*; **nunca** use a `service_role` no front)

Na hospedagem (Vercel/Netlify), cadastre as mesmas duas variáveis.

## 2. Banco de dados
SQL Editor → cole `supabase/migrations/001_schema.sql` → Run.
Cria: `profiles`, `clients`, `contracts`, `videos`, `expenses`, triggers, RPCs `claim_video`/`release_video`, RLS e realtime.

**Regras de acesso**
| Tabela | Quem acessa |
|---|---|
| `videos` | equipe ativa lê/cria/edita; só admin apaga |
| `clients`, `contracts`, `expenses` | somente admin |
| `profiles` | cada um vê o próprio; admin vê e edita todos |

**Fluxo de cadastro:** o **primeiro** usuário a se cadastrar vira **admin ativo**. Os demais entram como *editor inativo* e veem "Aguardando aprovação" até um admin liberar em **Equipe**.

## 3. Autenticação (Authentication → …)
- **URL Configuration**: *Site URL* = URL do app (ex.: `https://app.seudominio.com.br`). Em *Redirect URLs* adicione também `http://localhost:5173`.
- **Providers → Email**: ligado. Mantenha *Confirm email* ligado (recomendado). Mínimo de senha: 8.
- **Email Templates**: cole o conteúdo de `supabase/email-templates/` (Confirm signup e Reset password).

## 4. Resend (e-mails de confirmação e redefinição de senha)
1. No Resend: **Domains** → adicione e verifique seu domínio (DNS SPF/DKIM). Depois **API Keys** → crie uma chave.
2. No Supabase: **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: *sua API key do Resend*
   - Sender email: `no-reply@seudominio.com.br` (do domínio verificado) · Sender name: `Dara Audiovisual`
3. Pronto: cadastro e "esqueci a senha" já enviam pelo Resend.

### E-mail "acesso aprovado" (opcional, Edge Function)
```bash
supabase link --project-ref SEU_REF
supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM="Dara <no-reply@seudominio.com.br>" APP_URL=https://app.seudominio.com.br
supabase functions deploy send-email
```
A função só aceita chamadas de um admin ativo. Se não for publicada, a aprovação funciona igual (só não envia o aviso).

## 5. Rodar
```bash
npm install
npm run dev
```

## Observações
- Os dados antigos (localStorage/mock) **não** são migrados; começa vazio. Os IDs agora são UUID.
- "Pegar vídeo" na Fila usa RPC atômica (dois editores não pegam o mesmo vídeo).
- Kanban/Fila atualizam em tempo real entre usuários.
- Se o login falhar com "Email not confirmed", confirme pelo link ou desligue *Confirm email* só em desenvolvimento.
- O limite padrão de e-mails do SMTP embutido do Supabase é baixo — por isso o SMTP do Resend.
