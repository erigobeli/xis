-- ============================================
-- X Clone - Post media uploads and trending hashtags
-- Adds image support to posts, creates the post-images
-- bucket, and extracts hashtags automatically.
-- ============================================

begin;

alter table public.posts
  add column if not exists image_url text;

alter table public.posts
  drop constraint if exists posts_content_or_repost_check;

alter table public.posts
  add constraint posts_content_or_repost_check
  check (
    length(btrim(content)) > 0
    or repost_of_post_id is not null
    or image_url is not null
  );

create table if not exists public.post_hashtags (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  hashtag text not null,
  created_at timestamptz default now() not null,
  constraint post_hashtags_post_tag_unique unique (post_id, hashtag)
);

create index if not exists post_hashtags_post_id_idx on public.post_hashtags(post_id);
create index if not exists post_hashtags_hashtag_idx on public.post_hashtags(hashtag);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

create or replace function public.sync_post_hashtags()
returns trigger
language plpgsql
as $$
begin
  delete from public.post_hashtags
  where post_id = new.id;

  if length(btrim(coalesce(new.content, ''))) = 0 then
    return new;
  end if;

  insert into public.post_hashtags (post_id, hashtag)
  select
    new.id,
    lower((match_parts)[2])
  from regexp_matches(
    new.content,
    '(^|[^[:alnum:]_])#([[:alnum:]_]{1,50})',
    'g'
  ) as match_parts
  group by lower((match_parts)[2]);

  return new;
end;
$$;

drop trigger if exists sync_post_hashtags_on_write on public.posts;
create trigger sync_post_hashtags_on_write
after insert or update of content on public.posts
for each row
execute function public.sync_post_hashtags();

insert into public.post_hashtags (post_id, hashtag)
select
  posts.id,
  lower((match_parts)[2])
from public.posts
cross join lateral regexp_matches(
  posts.content,
  '(^|[^[:alnum:]_])#([[:alnum:]_]{1,50})',
  'g'
) as match_parts
on conflict (post_id, hashtag) do nothing;

create or replace function public.get_trending_hashtags(
  recent_days integer default 7,
  result_limit integer default 5
)
returns table (
  hashtag text,
  post_count bigint,
  recent_post_at timestamptz
)
language sql
stable
as $$
  select
    ph.hashtag,
    count(*)::bigint as post_count,
    max(p.created_at) as recent_post_at
  from public.post_hashtags ph
  join public.posts p on p.id = ph.post_id
  where p.created_at >= now() - make_interval(days => greatest(recent_days, 1))
  group by ph.hashtag
  order by post_count desc, recent_post_at desc
  limit greatest(result_limit, 1);
$$;

alter table public.post_hashtags enable row level security;

drop policy if exists "Authenticated users can view post hashtags" on public.post_hashtags;
create policy "Authenticated users can view post hashtags"
  on public.post_hashtags for select
  to authenticated
  using (true);

drop policy if exists "Users can insert hashtags for own posts" on public.post_hashtags;
create policy "Users can insert hashtags for own posts"
  on public.post_hashtags for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts
      where posts.id = post_id
        and posts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete hashtags for own posts" on public.post_hashtags;
create policy "Users can delete hashtags for own posts"
  on public.post_hashtags for delete
  to authenticated
  using (
    exists (
      select 1
      from public.posts
      where posts.id = post_id
        and posts.user_id = auth.uid()
    )
  );

commit;

-- ============================================
-- Storage bucket setup (run in Supabase Dashboard > SQL Editor)
-- ============================================
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own post images" on storage.objects;
create policy "Users can upload own post images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own post images" on storage.objects;
create policy "Users can update own post images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can view post images" on storage.objects;
create policy "Anyone can view post images"
  on storage.objects for select
  to public
  using (bucket_id = 'post-images');

drop policy if exists "Users can delete own post images" on storage.objects;
create policy "Users can delete own post images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
