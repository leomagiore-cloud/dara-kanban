-- ============================================================
-- DARA Audiovisual — schema completo (tabelas, RLS, funções)
-- Rode no Supabase: SQL Editor → New query → colar → Run
-- Pode ser rodado mais de uma vez (idempotente).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PROFILES (1 linha por usuário do auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  role        text not null default 'editor' check (role in ('admin','editor')),
  is_active   boolean not null default false,   -- só entra no sistema depois de aprovado
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. CLIENTES e CONTRATOS
-- ------------------------------------------------------------
create table if not exists public.clients (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  company           text not null default '',
  phone             text not null default '',
  email             text not null default '',
  instagram         text not null default '',
  plan              text not null default 'Essencial',
  monthly_value     numeric(12,2) not null default 0,
  contracted_videos integer not null default 0,
  notes             text not null default '',
  created_at        timestamptz not null default now()
);

create table if not exists public.contracts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  number           text not null unique,
  plan             text not null default 'Essencial',
  videos_per_month integer not null default 0,
  monthly_value    numeric(12,2) not null default 0,
  duration         integer not null default 12,
  payment_method   text not null default '',
  due_day          integer not null default 10,
  observation      text not null default '',
  start_date       date,
  end_date         date,
  status           text not null default 'ativo' check (status in ('ativo','a_vencer','vencido','cancelado')),
  cancelled_at     date,
  generated_at     timestamptz not null default now()
);
create index if not exists contracts_client_idx on public.contracts(client_id);

-- ------------------------------------------------------------
-- 3. VÍDEOS (kanban + fila de edição)
-- ------------------------------------------------------------
create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  client           text not null default '',
  title            text not null,
  shoot_date       date,
  due_date         date,
  editor           text not null default '',
  priority         text not null default 'Normal',
  format           text not null default '',
  type             text not null default '',
  notes            text not null default '',
  files_link       text not null default '',
  script_link      text not null default '',
  stage            text not null default 'GRAVADO'
                   check (stage in ('GRAVADO','DECUPAGEM','EDICAO','FINALIZACAO','REVISAO','ENVIADO','ALTERACAO','CONCLUIDO')),
  sort_order       integer not null default 0,
  checklist        jsonb not null default '{}'::jsonb,
  revisions        jsonb not null default '[]'::jsonb,
  history          jsonb not null default '[]'::jsonb,
  claimed_by       text,
  claimed_by_email text,
  claimed_at       text,
  version          integer not null default 1,
  created_by       uuid references auth.users(id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists videos_stage_idx on public.videos(stage);
create index if not exists videos_due_idx   on public.videos(due_date);

-- ------------------------------------------------------------
-- 4. DESPESAS
-- ------------------------------------------------------------
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  description text not null,
  value       numeric(12,2) not null default 0,
  category    text not null default 'Outros',
  date        date not null default current_date,
  created_by  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. FUNÇÕES AUXILIARES (SECURITY DEFINER evita recursão de RLS)
-- ------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'admin');
$$;

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists videos_touch on public.videos;
create trigger videos_touch before update on public.videos
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 6. NOVO USUÁRIO → cria profile
--    O PRIMEIRO usuário vira admin ativo. Os demais entram como
--    editor INATIVO até um admin aprovar (tela "Equipe").
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, name, email, role, is_active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    coalesce(new.email,''),
    case when first_user then 'admin' else 'editor' end,
    first_user
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um usuário comum mude o próprio role / is_active / email
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor / service role: liberado
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email then
      raise exception 'Apenas administradores podem alterar cargo, status ou e-mail.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ------------------------------------------------------------
-- 7. PEGAR / LIBERAR VÍDEO (atômico — evita 2 editores pegarem o mesmo)
-- ------------------------------------------------------------
create or replace function public.claim_video(p_id uuid)
returns public.videos language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  v  public.videos;
  stamp text := to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM, HH24:MI');
begin
  select * into me from public.profiles where id = auth.uid() and is_active;
  if me.id is null then raise exception 'not_authorized'; end if;

  update public.videos
     set claimed_by = me.name,
         claimed_by_email = me.email,
         claimed_at = stamp,
         version = version + 1,
         history = history || jsonb_build_array(jsonb_build_object('at', stamp, 'text', 'Pego por ' || me.name))
   where id = p_id
     and (claimed_by is null or claimed_by_email = me.email)
  returning * into v;

  if v.id is null then
    if exists (select 1 from public.videos where id = p_id) then
      raise exception 'already_claimed';
    else
      raise exception 'not_found';
    end if;
  end if;
  return v;
end $$;

create or replace function public.release_video(p_id uuid)
returns public.videos language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  v  public.videos;
  stamp text := to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM, HH24:MI');
begin
  select * into me from public.profiles where id = auth.uid() and is_active;
  if me.id is null then raise exception 'not_authorized'; end if;

  update public.videos
     set claimed_by = null, claimed_by_email = null, claimed_at = null,
         version = version + 1,
         history = history || jsonb_build_array(jsonb_build_object('at', stamp, 'text', 'Liberado por ' || me.name))
   where id = p_id
     and (claimed_by_email = me.email or me.role = 'admin')
  returning * into v;

  if v.id is null then raise exception 'not_allowed'; end if;
  return v;
end $$;

revoke all on function public.claim_video(uuid)   from public, anon;
revoke all on function public.release_video(uuid) from public, anon;
grant execute on function public.claim_video(uuid)   to authenticated;
grant execute on function public.release_video(uuid) to authenticated;

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.clients   enable row level security;
alter table public.contracts enable row level security;
alter table public.videos    enable row level security;
alter table public.expenses  enable row level security;

-- profiles ----------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- equipe ativa precisa enxergar nomes (ex.: filtro de editor)
drop policy if exists "profiles_select_team" on public.profiles;
create policy "profiles_select_team" on public.profiles
  for select to authenticated
  using (public.is_active_user() and is_active);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- (sem policy de INSERT/DELETE: o insert é feito pelo trigger; delete via painel)

-- videos: equipe ativa lê/cria/edita; só admin apaga ----------
drop policy if exists "videos_select" on public.videos;
create policy "videos_select" on public.videos
  for select to authenticated using (public.is_active_user());

drop policy if exists "videos_insert" on public.videos;
create policy "videos_insert" on public.videos
  for insert to authenticated with check (public.is_active_user());

drop policy if exists "videos_update" on public.videos;
create policy "videos_update" on public.videos
  for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "videos_delete" on public.videos;
create policy "videos_delete" on public.videos
  for delete to authenticated using (public.is_admin());

-- clients / contracts / expenses: somente admin ----------------
drop policy if exists "clients_admin_all" on public.clients;
create policy "clients_admin_all" on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contracts_admin_all" on public.contracts;
create policy "contracts_admin_all" on public.contracts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all" on public.expenses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 9. PERMISSÕES DE TABELA (anon não acessa nada)
-- ------------------------------------------------------------
revoke all on public.profiles, public.clients, public.contracts, public.videos, public.expenses from anon;
grant select, insert, update, delete on public.clients, public.contracts, public.videos, public.expenses to authenticated;
grant select, update on public.profiles to authenticated;

-- ------------------------------------------------------------
-- 10. REALTIME (kanban/fila atualizam ao vivo entre editores)
-- ------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.videos;
exception when duplicate_object then null; end $$;
