-- ============================================
-- X Clone - Add avatar support
-- Adds avatar_url column to profiles and
-- creates the avatars storage bucket.
-- ============================================

begin;

-- Add avatar_url column to profiles
alter table public.profiles
  add column if not exists avatar_url text;

commit;

-- ============================================
-- Storage bucket setup (run in Supabase Dashboard > SQL Editor)
-- ============================================
-- Create the avatars bucket as public
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update (overwrite) their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to read avatars (public bucket)
create policy "Anyone can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
