create extension if not exists pgcrypto;

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  contact_email text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  show_date timestamptz not null,
  submission_deadline timestamptz,
  theme text,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references public.shows(id) on delete set null,
  artist_id uuid references public.artists(id) on delete set null,
  artist_name text not null,
  track_title text not null,
  track_url text not null,
  genre text not null,
  message text,
  rights_confirmed boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'queued', 'played', 'reviewed', 'rejected')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.noticeboard_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  tag text,
  posted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.totn_nominations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  show_id uuid references public.shows(id) on delete cascade,
  artist_name text not null,
  track_title text not null,
  reason text,
  votes integer not null default 0 check (votes >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

create index if not exists submissions_status_idx
  on public.submissions (status);

revoke all on table public.artists from anon, authenticated;
revoke all on table public.shows from anon, authenticated;
revoke all on table public.noticeboard_posts from anon, authenticated;
revoke all on table public.totn_nominations from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;

grant insert on table public.submissions to anon, authenticated;
grant all on table public.artists to service_role;
grant all on table public.shows to service_role;
grant all on table public.submissions to service_role;
grant all on table public.noticeboard_posts to service_role;
grant all on table public.totn_nominations to service_role;

alter table public.submissions enable row level security;

create policy "public_can_create_pending_submissions"
on public.submissions
for insert
to anon, authenticated
with check (
  rights_confirmed = true
  and status = 'pending'
);
