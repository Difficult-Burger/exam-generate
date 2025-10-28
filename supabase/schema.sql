-- Run this script inside your Supabase project (SQL Editor).
-- It provisions tables, relationships, and row-level security policies
-- required for the exam generation SaaS.

-- Profiles extend the default auth.users table.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  free_downloads_remaining int not null default 3,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Users can select their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- User-provided materials: slides (required) + optional sample exam.
create table if not exists public.course_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  course_title text not null,
  course_description text,
  slides_storage_path text not null,
  sample_storage_path text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.course_submissions enable row level security;

create index if not exists course_submissions_owner_id_idx on public.course_submissions (owner_id);

create policy "Users can insert their own course submissions"
  on public.course_submissions for insert
  with check (auth.uid() = owner_id);

create policy "Users can see their own course submissions"
  on public.course_submissions for select
  using (auth.uid() = owner_id);

create policy "Users can update their own course submissions"
  on public.course_submissions for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);


-- Generated exams.
create table if not exists public.exam_generations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.course_submissions (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'completed', -- enums: pending | completed | failed
  model text,
  prompt text,
  output_markdown text,
  pdf_storage_path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.exam_generations enable row level security;

create index if not exists exam_generations_owner_id_idx on public.exam_generations (owner_id);
create index if not exists exam_generations_submission_id_idx on public.exam_generations (submission_id);

create policy "Users can manage their own exam generations"
  on public.exam_generations for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);


-- Track downloads and pricing.
create table if not exists public.download_events (
  id bigserial primary key,
  generation_id uuid not null references public.exam_generations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cost_cents int not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.download_events enable row level security;

create index if not exists download_events_user_id_idx on public.download_events (user_id);
create index if not exists download_events_generation_id_idx on public.download_events (generation_id);

create policy "Users can insert their own download events"
  on public.download_events for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own download events"
  on public.download_events for select
  using (auth.uid() = user_id);


-- Helper function to decrement free download credits atomically.
create or replace function public.consume_free_download(p_user_id uuid)
returns boolean
language plpgsql
as $$
declare
  current_remaining int;
begin
  select free_downloads_remaining into current_remaining
  from public.profiles
  where id = p_user_id
  for update;

  if current_remaining is null then
    insert into public.profiles (id, free_downloads_remaining)
    values (p_user_id, 2)
    on conflict (id) do update
      set free_downloads_remaining = greatest(public.profiles.free_downloads_remaining - 1, 0),
          updated_at = timezone('utc'::text, now());
    return true;
  elsif current_remaining > 0 then
    update public.profiles
    set free_downloads_remaining = current_remaining - 1,
        updated_at = timezone('utc'::text, now())
    where id = p_user_id;
    return true;
  else
    return false;
  end if;
end;
$$ security definer;


-- Storage bucket to host assets (run once).
insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload into their own folder.
create policy "Authenticated users can upload to course assets"
  on storage.objects for insert
  with check (
    bucket_id = 'course-assets'
    and auth.role() = 'authenticated'
  );

create policy "Users can read their own course assets"
  on storage.objects for select
  using (
    bucket_id = 'course-assets'
    and (split_part(name, '/', 1)) = auth.uid()::text
  );

create policy "Users can delete their own course assets"
  on storage.objects for delete
  using (
    bucket_id = 'course-assets'
    and (split_part(name, '/', 1)) = auth.uid()::text
  );
