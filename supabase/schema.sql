-- Run this once in the Supabase project's SQL Editor.
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default '日常'
    check (category in ('日常', '音楽', 'ゲーム', '料理', 'アニメーション')),
  video_path text not null,
  thumbnail_path text,
  created_at timestamptz not null default now()
);

alter table public.videos
  add column if not exists thumbnail_path text;

create index if not exists videos_created_at_idx
  on public.videos (created_at desc);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 200),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly visible" on public.profiles;
create policy "Profiles are publicly visible"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.videos enable row level security;

drop policy if exists "Published videos are visible to everyone" on public.videos;
create policy "Published videos are visible to everyone"
  on public.videos for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can publish their own videos" on public.videos;
create policy "Users can publish their own videos"
  on public.videos for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update their own videos" on public.videos;
create policy "Users can update their own videos"
  on public.videos for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own videos" on public.videos;
create policy "Users can delete their own videos"
  on public.videos for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  true,
  104857600,
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Videos are publicly viewable" on storage.objects;
create policy "Videos are publicly viewable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'videos');

drop policy if exists "Users can upload videos to their own folder" on storage.objects;
drop policy if exists "Users can upload videos and thumbnails to their own folder" on storage.objects;
create policy "Users can upload videos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete videos from their own folder" on storage.objects;
create policy "Users can delete videos from their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
