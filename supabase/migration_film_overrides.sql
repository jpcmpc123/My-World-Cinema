-- ============================================================
-- MyWorld Cinema â€” overrides de pÃ´ster/backdrop por filme
-- (Set film poster / Set film backdrop â€” visÃ­veis no site inteiro
--  para o usuÃ¡rio logado; salvos por usuÃ¡rio)
-- Cole este arquivo no SQL Editor do Supabase e rode.
-- ============================================================

create table if not exists public.film_overrides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  film_id integer not null,             -- id do TMDB
  poster_url text,                      -- URL customizada do pÃ´ster (null = padrÃ£o)
  backdrop_url text,                    -- URL customizada do backdrop (null = padrÃ£o)
  updated_at timestamptz not null default now(),
  primary key (user_id, film_id)
);

alter table public.film_overrides enable row level security;

-- sÃ³ o prÃ³prio usuÃ¡rio gerencia seus overrides (sÃ£o privados)
create policy "film_overrides_select" on public.film_overrides for select using (auth.uid() = user_id);
create policy "film_overrides_insert" on public.film_overrides for insert with check (auth.uid() = user_id);
create policy "film_overrides_update" on public.film_overrides for update using (auth.uid() = user_id);
create policy "film_overrides_delete" on public.film_overrides for delete using (auth.uid() = user_id);
