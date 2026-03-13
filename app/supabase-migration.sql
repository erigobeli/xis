-- ============================================
-- X Clone - Incremental schema update
-- Apply this after the initial profiles/posts schema already exists.
-- ============================================

begin;

alter table public.posts
  alter column content set default '';

update public.posts
set content = ''
where content is null;

alter table public.posts
  alter column content set not null;

alter table public.posts
  add column if not exists parent_post_id uuid references public.posts(id) on delete cascade,
  add column if not exists repost_of_post_id uuid references public.posts(id) on delete cascade;

create table if not exists public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  constraint post_likes_post_user_unique unique (post_id, user_id)
);

create index if not exists posts_parent_post_id_idx on public.posts(parent_post_id);
create index if not exists posts_repost_of_post_id_idx on public.posts(repost_of_post_id);
create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
create index if not exists post_likes_user_id_idx on public.post_likes(user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_content_or_repost_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_content_or_repost_check
      check (length(btrim(content)) > 0 or repost_of_post_id is not null);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_comment_not_repost_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_comment_not_repost_check
      check (not (parent_post_id is not null and repost_of_post_id is not null));
  end if;
end $$;

alter table public.post_likes enable row level security;

drop policy if exists "Authenticated users can view likes" on public.post_likes;
create policy "Authenticated users can view likes"
  on public.post_likes for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own likes" on public.post_likes;
create policy "Users can insert own likes"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own likes" on public.post_likes;
create policy "Users can delete own likes"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
