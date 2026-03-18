-- ============================================
-- X Clone - Follows feature
-- ============================================

begin;

create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  constraint follows_unique unique (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

alter table public.follows enable row level security;

drop policy if exists "Authenticated users can view follows" on public.follows;
create policy "Authenticated users can view follows"
  on public.follows for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own follows" on public.follows;
create policy "Users can insert own follows"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "Users can delete own follows" on public.follows;
create policy "Users can delete own follows"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

commit;
