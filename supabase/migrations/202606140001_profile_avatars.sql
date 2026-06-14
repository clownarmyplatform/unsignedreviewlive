alter table public.user_profiles
add column if not exists avatar_url text,
add column if not exists avatar_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name = auth.uid()::text || '/avatar.webp'
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name = auth.uid()::text || '/avatar.webp'
)
with check (
  bucket_id = 'avatars'
  and name = auth.uid()::text || '/avatar.webp'
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name = auth.uid()::text || '/avatar.webp'
);

create or replace function public.update_own_profile_avatar(
  p_avatar_url text,
  p_avatar_path text
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_profile public.user_profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to update your avatar.';
  end if;

  if nullif(trim(coalesce(p_avatar_url, '')), '') is null then
    raise exception 'Avatar URL is required.';
  end if;

  if nullif(trim(coalesce(p_avatar_path, '')), '') is null then
    raise exception 'Avatar path is required.';
  end if;

  if trim(p_avatar_path) <> current_user_id::text || '/avatar.webp' then
    raise exception 'Avatar path must match your account.';
  end if;

  update public.user_profiles
  set
    avatar_url = trim(p_avatar_url),
    avatar_path = trim(p_avatar_path),
    updated_at = timezone('utc', now())
  where auth_user_id = current_user_id
  returning * into updated_profile;

  if not found then
    raise exception 'User profile not found.';
  end if;

  return updated_profile;
end;
$$;

drop function if exists public.get_moderation_users();
create function public.get_moderation_users()
returns table (
  auth_user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz,
  submission_count integer,
  account_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_moderator_email text := lower(nullif(auth.jwt() ->> 'email', ''));
begin
  if not public.is_admin_email(current_moderator_email) then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    profile.auth_user_id,
    profile.display_name,
    profile.email,
    profile.avatar_url,
    profile.created_at,
    count(sub.id)::integer as submission_count,
    profile.account_status
  from public.user_profiles as profile
  left join public.submissions as sub
    on sub.auth_user_id = profile.auth_user_id
  group by
    profile.auth_user_id,
    profile.display_name,
    profile.email,
    profile.avatar_url,
    profile.created_at,
    profile.account_status
  order by profile.created_at desc;
end;
$$;

drop function if exists public.search_moderation_users(text);
create function public.search_moderation_users(
  p_query text
)
returns table (
  auth_user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz,
  submission_count integer,
  account_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_moderator_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  trimmed_query text := trim(coalesce(p_query, ''));
begin
  if not public.is_admin_email(current_moderator_email) then
    raise exception 'Admin access required.';
  end if;

  if length(trimmed_query) < 2 then
    return;
  end if;

  return query
  select
    profile.auth_user_id,
    profile.display_name,
    profile.email,
    profile.avatar_url,
    profile.created_at,
    count(sub.id)::integer as submission_count,
    profile.account_status
  from public.user_profiles as profile
  left join public.submissions as sub
    on sub.auth_user_id = profile.auth_user_id
  where
    coalesce(profile.display_name, '') ilike '%' || trimmed_query || '%'
    or profile.email ilike '%' || trimmed_query || '%'
    or profile.account_status ilike '%' || trimmed_query || '%'
  group by
    profile.auth_user_id,
    profile.display_name,
    profile.email,
    profile.avatar_url,
    profile.created_at,
    profile.account_status
  order by profile.created_at desc;
end;
$$;

drop function if exists public.get_moderation_submissions();
create function public.get_moderation_submissions()
returns table (
  submission_id uuid,
  artist_name text,
  track_title text,
  submitter text,
  submitter_email text,
  submitter_avatar_url text,
  show_id uuid,
  show_title text,
  created_at timestamptz,
  moderation_status text,
  queue_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_moderator_email text := lower(nullif(auth.jwt() ->> 'email', ''));
begin
  if not public.is_admin_email(current_moderator_email) then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    sub.id,
    sub.artist_name,
    sub.track_title,
    coalesce(profile.display_name, sub.submitter_email, 'Unknown submitter'),
    sub.submitter_email,
    profile.avatar_url,
    sub.show_id,
    show_record.title,
    sub.created_at,
    sub.moderation_status,
    sub.status::text
  from public.submissions as sub
  left join public.user_profiles as profile
    on profile.auth_user_id = sub.auth_user_id
  left join public.shows as show_record
    on show_record.id = sub.show_id
  order by sub.created_at desc;
end;
$$;

drop function if exists public.search_moderation_submissions(text);
create function public.search_moderation_submissions(
  p_query text
)
returns table (
  submission_id uuid,
  artist_name text,
  track_title text,
  submitter text,
  submitter_email text,
  submitter_avatar_url text,
  show_id uuid,
  show_title text,
  created_at timestamptz,
  moderation_status text,
  queue_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_moderator_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  trimmed_query text := trim(coalesce(p_query, ''));
begin
  if not public.is_admin_email(current_moderator_email) then
    raise exception 'Admin access required.';
  end if;

  if length(trimmed_query) < 2 then
    return;
  end if;

  return query
  select
    sub.id,
    sub.artist_name,
    sub.track_title,
    coalesce(profile.display_name, sub.submitter_email, 'Unknown submitter'),
    sub.submitter_email,
    profile.avatar_url,
    sub.show_id,
    show_record.title,
    sub.created_at,
    sub.moderation_status,
    sub.status::text
  from public.submissions as sub
  left join public.user_profiles as profile
    on profile.auth_user_id = sub.auth_user_id
  left join public.shows as show_record
    on show_record.id = sub.show_id
  where
    sub.artist_name ilike '%' || trimmed_query || '%'
    or sub.track_title ilike '%' || trimmed_query || '%'
    or coalesce(profile.display_name, '') ilike '%' || trimmed_query || '%'
    or coalesce(sub.submitter_email, '') ilike '%' || trimmed_query || '%'
  order by sub.created_at desc;
end;
$$;

drop function if exists public.get_public_recent_submissions();
create function public.get_public_recent_submissions()
returns table (
  id uuid,
  artist_name text,
  track_title text,
  genre text,
  status text,
  created_at timestamptz,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show_id uuid;
begin
  select s.id
  into target_show_id
  from public.shows as s
  where s.status in ('scheduled', 'live')
    and s.ends_at >= timezone('utc', now())
  order by s.show_date asc
  limit 1;

  if not found then
    return;
  end if;

  return query
  select
    sub.id,
    sub.artist_name,
    sub.track_title,
    sub.genre,
    sub.status::text,
    sub.created_at,
    profile.avatar_url
  from public.submissions as sub
  left join public.user_profiles as profile
    on profile.auth_user_id = sub.auth_user_id
  where sub.show_id = target_show_id
    and sub.moderation_status = 'approved'
  order by sub.created_at desc
  limit 8;
end;
$$;

drop function if exists public.get_unplayed_submissions_for_upcoming_show();
create function public.get_unplayed_submissions_for_upcoming_show()
returns table (
  id uuid,
  show_id uuid,
  artist_name text,
  track_title text,
  track_url text,
  genre text,
  message text,
  rights_confirmed boolean,
  status text,
  created_at timestamptz,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show_id uuid;
begin
  select s.id
  into target_show_id
  from public.shows as s
  where s.status in ('scheduled', 'live')
    and s.ends_at >= timezone('utc', now())
  order by s.show_date asc
  limit 1;

  if not found then
    return;
  end if;

  return query
  select
    sub.id,
    sub.show_id,
    sub.artist_name,
    sub.track_title,
    sub.track_url,
    sub.genre,
    sub.message,
    sub.rights_confirmed,
    sub.status::text,
    sub.created_at,
    profile.avatar_url
  from public.submissions as sub
  left join public.user_profiles as profile
    on profile.auth_user_id = sub.auth_user_id
  where sub.show_id = target_show_id
    and sub.moderation_status = 'approved'
    and sub.status in ('pending', 'queued')
  order by sub.created_at asc;
end;
$$;

drop function if exists public.get_show_queue_for_active_show();
create function public.get_show_queue_for_active_show()
returns table (
  show_id uuid,
  show_title text,
  show_date timestamptz,
  submission_id uuid,
  artist_name text,
  track_title text,
  track_url text,
  genre text,
  message text,
  status text,
  created_at timestamptz,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show public.shows%rowtype;
begin
  select s.*
  into target_show
  from public.shows as s
  where s.status in ('scheduled', 'live')
    and s.ends_at >= timezone('utc', now())
  order by s.show_date asc
  limit 1;

  if not found then
    return;
  end if;

  return query
  select
    target_show.id,
    target_show.title,
    target_show.show_date,
    sub.id,
    sub.artist_name,
    sub.track_title,
    sub.track_url,
    sub.genre,
    sub.message,
    sub.status::text,
    sub.created_at,
    profile.avatar_url
  from public.submissions as sub
  left join public.user_profiles as profile
    on profile.auth_user_id = sub.auth_user_id
  where sub.show_id = target_show.id
    and sub.moderation_status = 'approved'
    and sub.status in ('pending', 'queued', 'played', 'reviewed')
  order by sub.created_at asc;
end;
$$;

drop function if exists public.get_url_archive_show_tracks(uuid);
create function public.get_url_archive_show_tracks(
  p_show_id uuid
)
returns table (
  submission_id uuid,
  artist_name text,
  track_title text,
  genre text,
  status text,
  created_at timestamptz,
  is_totn_nominated boolean,
  is_totn_winner boolean,
  nomination_votes integer,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_show_id is null then
    return;
  end if;

  return query
  with ranked_winners as (
    select
      nom.id,
      nom.submission_id,
      nom.show_id,
      nom.votes,
      row_number() over (
        partition by nom.show_id
        order by nom.votes desc, nom.created_at asc
      ) as winner_rank
    from public.totn_nominations as nom
    where nom.show_id = p_show_id
  )
  select
    sub.id,
    sub.artist_name,
    sub.track_title,
    sub.genre,
    sub.status::text,
    sub.created_at,
    nom.id is not null,
    winner.id is not null,
    coalesce(nom.votes, 0),
    profile.avatar_url
  from public.submissions as sub
  left join public.user_profiles as profile
    on profile.auth_user_id = sub.auth_user_id
  left join public.totn_nominations as nom
    on nom.submission_id = sub.id
   and nom.show_id = p_show_id
  left join ranked_winners as winner
    on winner.submission_id = sub.id
   and winner.winner_rank = 1
  where sub.show_id = p_show_id
    and sub.moderation_status = 'approved'
  order by sub.created_at asc;
end;
$$;

grant execute on function public.update_own_profile_avatar(text, text) to authenticated;
