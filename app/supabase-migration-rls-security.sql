-- ============================================
-- X Clone - RLS policies for profiles and posts
-- CRITICAL: Run this migration to secure your database
-- ============================================

begin;

-- ============================================
-- PROFILES TABLE - Row Level Security
-- ============================================

alter table public.profiles enable row level security;

-- Everyone authenticated can view profiles (needed for feed, search, etc.)
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only insert their own profile (during signup)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can only update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can only delete their own profile
drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- ============================================
-- POSTS TABLE - Row Level Security
-- ============================================

alter table public.posts enable row level security;

-- Everyone authenticated can view all posts
drop policy if exists "Authenticated users can view posts" on public.posts;
create policy "Authenticated users can view posts"
  on public.posts for select
  to authenticated
  using (true);

-- Users can only create posts as themselves (prevents impersonation)
drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can only update their own posts
drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only delete their own posts
drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
