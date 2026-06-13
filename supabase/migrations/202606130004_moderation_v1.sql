create table if not exists public.user_profiles (
  auth_user_id uuid primary key,
  email text not null,
  display_name text,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  suspended_at timestamptz,
  suspended_by_user_id uuid
);

create table if not exists public.moderation_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid,
  target_submission_id uuid,
  moderator_user_id uuid not null,
  moderator_email text not null,
  moderator_name text,
  action_type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.submissions
add column if not exists moderation_status text not null default 'approved'
  check (moderation_status in ('approved', 'rejected', 'removed')),
add column if not exists moderated_at timestamptz,
add column if not exists moderated_by_user_id uuid;

update public.submissions
set moderation_status = 'approved'
where moderation_status is null;

create index if not exists user_profiles_email_idx
  on public.user_profiles (lower(email));

create index if not exists user_profiles_display_name_idx
  on public.user_profiles (lower(coalesce(display_name, '')));

create index if not exists submissions_moderation_status_idx
  on public.submissions (moderation_status, created_at desc);

create index if not exists moderation_audit_log_created_at_idx
  on public.moderation_audit_log (created_at desc);

grant select on table public.user_profiles to authenticated;
revoke all on table public.moderation_audit_log from anon, authenticated;
grant all on table public.user_profiles to service_role;
grant all on table public.moderation_audit_log to service_role;

alter table public.user_profiles enable row level security;

drop policy if exists "authenticated_users_can_view_own_profile" on public.user_profiles;
create policy "authenticated_users_can_view_own_profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = auth_user_id);

create or replace function public.is_admin_email(p_email text)
returns boolean
language sql
stable
as $$
  select lower(coalesce(p_email, '')) in (
    'mrmatthewking89@gmail.com',
    'clownarmyhost@gmail.com',
    'clownarmyplatform@gmail.com'
  );
$$;

create or replace function public.sync_user_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    auth_user_id,
    email,
    display_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    coalesce(new.created_at, timezone('utc', now())),
    timezone('utc', now())
  )
  on conflict (auth_user_id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists sync_user_profile_from_auth_user on auth.users;
create trigger sync_user_profile_from_auth_user
after insert or update of email, raw_user_meta_data
on auth.users
for each row
execute function public.sync_user_profile_from_auth_user();

insert into public.user_profiles (
  auth_user_id,
  email,
  display_name,
  created_at,
  updated_at
)
select
  auth_user.id,
  lower(coalesce(auth_user.email, '')),
  nullif(trim(coalesce(auth_user.raw_user_meta_data ->> 'display_name', '')), ''),
  coalesce(auth_user.created_at, timezone('utc', now())),
  timezone('utc', now())
from auth.users as auth_user
on conflict (auth_user_id) do update
set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
  updated_at = timezone('utc', now());

create or replace function public.update_own_profile_display_name(
  p_display_name text
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
    raise exception 'You must be signed in to update your profile.';
  end if;

  update public.user_profiles
  set
    display_name = nullif(trim(coalesce(p_display_name, '')), ''),
    updated_at = timezone('utc', now())
  where auth_user_id = current_user_id
  returning * into updated_profile;

  if not found then
    raise exception 'User profile not found.';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.get_moderation_users()
returns table (
  auth_user_id uuid,
  display_name text,
  email text,
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
    profile.created_at,
    profile.account_status
  order by profile.created_at desc;
end;
$$;

create or replace function public.search_moderation_users(
  p_query text
)
returns table (
  auth_user_id uuid,
  display_name text,
  email text,
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
    profile.created_at,
    count(sub.id)::integer as submission_count,
    profile.account_status
  from public.user_profiles as profile
  left join public.submissions as sub
    on sub.auth_user_id = profile.auth_user_id
  where
    coalesce(profile.display_name, '') ilike '%' || trimmed_query || '%'
    or profile.email ilike '%' || trimmed_query || '%'
  group by
    profile.auth_user_id,
    profile.display_name,
    profile.email,
    profile.created_at,
    profile.account_status
  order by profile.created_at desc;
end;
$$;

create or replace function public.set_user_account_status(
  p_target_user_id uuid,
  p_status text
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_moderator_id uuid := auth.uid();
  current_moderator_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  current_moderator_name text := nullif(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'display_name', '')), '');
  normalized_status text := lower(trim(coalesce(p_status, '')));
  updated_profile public.user_profiles%rowtype;
begin
  if current_moderator_id is null or not public.is_admin_email(current_moderator_email) then
    raise exception 'Admin access required.';
  end if;

  if normalized_status not in ('active', 'suspended') then
    raise exception 'Invalid account status.';
  end if;

  update public.user_profiles
  set
    account_status = normalized_status,
    updated_at = timezone('utc', now()),
    suspended_at = case
      when normalized_status = 'suspended' then timezone('utc', now())
      else null
    end,
    suspended_by_user_id = case
      when normalized_status = 'suspended' then current_moderator_id
      else null
    end
  where auth_user_id = p_target_user_id
  returning * into updated_profile;

  if not found then
    raise exception 'User not found.';
  end if;

  insert into public.moderation_audit_log (
    target_user_id,
    moderator_user_id,
    moderator_email,
    moderator_name,
    action_type
  )
  values (
    updated_profile.auth_user_id,
    current_moderator_id,
    current_moderator_email,
    current_moderator_name,
    case
      when normalized_status = 'suspended' then 'user_suspended'
      else 'user_unsuspended'
    end
  );

  return updated_profile;
end;
$$;

create or replace function public.get_moderation_submissions()
returns table (
  submission_id uuid,
  artist_name text,
  track_title text,
  submitter text,
  submitter_email text,
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

create or replace function public.search_moderation_submissions(
  p_query text
)
returns table (
  submission_id uuid,
  artist_name text,
  track_title text,
  submitter text,
  submitter_email text,
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

create or replace function public.set_submission_moderation_status(
  p_submission_id uuid,
  p_status text
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_moderator_id uuid := auth.uid();
  current_moderator_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  current_moderator_name text := nullif(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'display_name', '')), '');
  normalized_status text := lower(trim(coalesce(p_status, '')));
  updated_submission public.submissions%rowtype;
begin
  if current_moderator_id is null or not public.is_admin_email(current_moderator_email) then
    raise exception 'Admin access required.';
  end if;

  if normalized_status not in ('approved', 'rejected', 'removed') then
    raise exception 'Invalid moderation status.';
  end if;

  update public.submissions
  set
    moderation_status = normalized_status,
    moderated_at = timezone('utc', now()),
    moderated_by_user_id = current_moderator_id
  where id = p_submission_id
  returning * into updated_submission;

  if not found then
    raise exception 'Submission not found.';
  end if;

  insert into public.moderation_audit_log (
    target_submission_id,
    moderator_user_id,
    moderator_email,
    moderator_name,
    action_type
  )
  values (
    updated_submission.id,
    current_moderator_id,
    current_moderator_email,
    current_moderator_name,
    case normalized_status
      when 'removed' then 'submission_removed'
      when 'rejected' then 'submission_rejected'
      else 'submission_restored_approved'
    end
  );

  return updated_submission;
end;
$$;

create or replace function public.get_recent_moderation_actions()
returns table (
  id uuid,
  action_type text,
  moderator_user_id uuid,
  moderator_email text,
  moderator_name text,
  target_user_id uuid,
  target_submission_id uuid,
  target_summary text,
  created_at timestamptz
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
    audit.id,
    audit.action_type,
    audit.moderator_user_id,
    audit.moderator_email,
    audit.moderator_name,
    audit.target_user_id,
    audit.target_submission_id,
    coalesce(
      profile.display_name,
      profile.email,
      case
        when sub.id is not null then sub.artist_name || ' - ' || sub.track_title
        else 'Moderation target'
      end
    ) as target_summary,
    audit.created_at
  from public.moderation_audit_log as audit
  left join public.user_profiles as profile
    on profile.auth_user_id = audit.target_user_id
  left join public.submissions as sub
    on sub.id = audit.target_submission_id
  order by audit.created_at desc
  limit 20;
end;
$$;

create or replace function public.create_submission_for_next_show(
  p_artist_name text,
  p_track_title text,
  p_track_url text,
  p_genre text,
  p_message text,
  p_rights_confirmed boolean
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show public.shows%rowtype;
  submission_count integer;
  existing_submission_id uuid;
  new_submission public.submissions%rowtype;
  max_submissions integer := 30;
  current_user_id uuid := auth.uid();
  current_user_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  current_account_status text := 'active';
begin
  if current_user_id is null then
    raise exception 'You must be signed in to submit a track.';
  end if;

  select profile.account_status
  into current_account_status
  from public.user_profiles as profile
  where profile.auth_user_id = current_user_id;

  if current_account_status = 'suspended' then
    raise exception 'Your account is suspended. Track submission is unavailable.';
  end if;

  if coalesce(trim(p_artist_name), '') = ''
    or coalesce(trim(p_track_title), '') = ''
    or coalesce(trim(p_track_url), '') = ''
    or coalesce(trim(p_genre), '') = '' then
    raise exception 'Missing required submission fields.';
  end if;

  if p_rights_confirmed is distinct from true then
    raise exception 'Rights must be confirmed before submitting.';
  end if;

  select s.*
  into target_show
  from public.shows as s
  where s.status in ('scheduled', 'live')
    and s.ends_at >= timezone('utc', now())
  order by s.show_date asc
  limit 1
  for update;

  if not found then
    raise exception 'No upcoming show is currently accepting submissions.';
  end if;

  select sub.id
  into existing_submission_id
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.auth_user_id = current_user_id
  order by sub.created_at asc
  limit 1;

  if existing_submission_id is not null then
    raise exception 'You already have a track submitted for this show. Please edit your existing submission instead.';
  end if;

  select count(*)
  into submission_count
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.moderation_status = 'approved';

  if submission_count >= max_submissions then
    raise exception 'Sorry, the queue for this show is full';
  end if;

  insert into public.submissions (
    show_id,
    auth_user_id,
    submitter_email,
    artist_name,
    track_title,
    track_url,
    genre,
    message,
    rights_confirmed,
    status,
    moderation_status
  )
  values (
    target_show.id,
    current_user_id,
    current_user_email,
    trim(p_artist_name),
    trim(p_track_title),
    trim(p_track_url),
    trim(p_genre),
    nullif(trim(coalesce(p_message, '')), ''),
    true,
    'pending',
    'approved'
  )
  returning * into new_submission;

  return new_submission;
end;
$$;

create or replace function public.update_own_submission(
  p_submission_id uuid,
  p_artist_name text,
  p_track_title text,
  p_track_url text,
  p_genre text,
  p_message text,
  p_rights_confirmed boolean
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_account_status text := 'active';
  updated_submission public.submissions%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to edit a submission.';
  end if;

  select profile.account_status
  into current_account_status
  from public.user_profiles as profile
  where profile.auth_user_id = current_user_id;

  if current_account_status = 'suspended' then
    raise exception 'Your account is suspended. Submission editing is unavailable.';
  end if;

  if p_submission_id is null then
    raise exception 'Submission ID is required.';
  end if;

  if coalesce(trim(p_artist_name), '') = ''
    or coalesce(trim(p_track_title), '') = ''
    or coalesce(trim(p_track_url), '') = ''
    or coalesce(trim(p_genre), '') = '' then
    raise exception 'Missing required submission fields.';
  end if;

  if p_rights_confirmed is distinct from true then
    raise exception 'Rights must remain confirmed.';
  end if;

  update public.submissions
  set
    artist_name = trim(p_artist_name),
    track_title = trim(p_track_title),
    track_url = trim(p_track_url),
    genre = trim(p_genre),
    message = nullif(trim(coalesce(p_message, '')), ''),
    rights_confirmed = true
  where id = p_submission_id
    and auth_user_id = current_user_id
    and status in ('pending', 'queued')
    and moderation_status = 'approved'
  returning * into updated_submission;

  if not found then
    raise exception 'Submission not found or can no longer be edited.';
  end if;

  return updated_submission;
end;
$$;

create or replace function public.get_submission_window_status()
returns table (
  show_id uuid,
  show_title text,
  show_date timestamptz,
  submission_deadline timestamptz,
  submission_limit integer,
  current_submission_count integer,
  places_left integer,
  is_open boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show public.shows%rowtype;
  submission_count integer;
  max_submissions integer := 30;
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

  select count(*)
  into submission_count
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.moderation_status = 'approved';

  return query
  select
    target_show.id,
    target_show.title,
    target_show.show_date,
    target_show.submission_deadline,
    max_submissions,
    submission_count,
    greatest(max_submissions - submission_count, 0),
    submission_count < max_submissions;
end;
$$;

create or replace function public.get_admin_dashboard_snapshot()
returns table (
  show_id uuid,
  show_title text,
  show_date timestamptz,
  ends_at timestamptz,
  submission_deadline timestamptz,
  theme text,
  venue text,
  submission_count integer,
  places_left integer,
  unplayed_count integer,
  totn_count integer,
  noticeboard_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show public.shows%rowtype;
  current_submission_count integer := 0;
  current_unplayed_count integer := 0;
  current_totn_count integer := 0;
  current_noticeboard_count integer := 0;
  max_submissions integer := 30;
begin
  select s.*
  into target_show
  from public.shows as s
  where s.status in ('scheduled', 'live')
    and s.ends_at >= timezone('utc', now())
  order by s.show_date asc
  limit 1;

  select count(*)
  into current_noticeboard_count
  from public.noticeboard_posts;

  if not found then
    return query
    select
      null::uuid,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      null::text,
      null::text,
      0,
      30,
      0,
      0,
      current_noticeboard_count;
    return;
  end if;

  select count(*)
  into current_submission_count
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.moderation_status = 'approved';

  select count(*)
  into current_unplayed_count
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.moderation_status = 'approved'
    and sub.status in ('pending', 'queued');

  select count(*)
  into current_totn_count
  from public.totn_nominations as nom
  join public.submissions as sub
    on sub.id = nom.submission_id
  where nom.show_id = target_show.id
    and sub.moderation_status = 'approved';

  return query
  select
    target_show.id,
    target_show.title,
    target_show.show_date,
    target_show.ends_at,
    target_show.submission_deadline,
    target_show.theme,
    target_show.venue,
    current_submission_count,
    greatest(max_submissions - current_submission_count, 0),
    current_unplayed_count,
    current_totn_count,
    current_noticeboard_count;
end;
$$;

create or replace function public.get_public_recent_submissions()
returns table (
  id uuid,
  artist_name text,
  track_title text,
  genre text,
  status text,
  created_at timestamptz
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
    sub.created_at
  from public.submissions as sub
  where sub.show_id = target_show_id
    and sub.moderation_status = 'approved'
  order by sub.created_at desc
  limit 8;
end;
$$;

create or replace function public.get_unplayed_submissions_for_upcoming_show()
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
  created_at timestamptz
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
    sub.created_at
  from public.submissions as sub
  where sub.show_id = target_show_id
    and sub.moderation_status = 'approved'
    and sub.status in ('pending', 'queued')
  order by sub.created_at asc;
end;
$$;

create or replace function public.get_totn_board_for_active_show()
returns table (
  nomination_id uuid,
  submission_id uuid,
  show_id uuid,
  show_title text,
  artist_name text,
  track_title text,
  votes integer,
  created_at timestamptz,
  has_user_vote boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show public.shows%rowtype;
  current_user_id uuid := auth.uid();
  user_vote_nomination_id uuid := null;
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

  if current_user_id is not null then
    select v.nomination_id
    into user_vote_nomination_id
    from public.totn_votes as v
    where v.show_id = target_show.id
      and v.auth_user_id = current_user_id
    limit 1;
  end if;

  return query
  select
    nom.id,
    nom.submission_id,
    nom.show_id,
    target_show.title,
    nom.artist_name,
    nom.track_title,
    nom.votes,
    nom.created_at,
    nom.id = user_vote_nomination_id
  from public.totn_nominations as nom
  join public.submissions as sub
    on sub.id = nom.submission_id
  where nom.show_id = target_show.id
    and sub.moderation_status = 'approved'
  order by nom.votes desc, nom.created_at asc;
end;
$$;

drop function if exists public.get_show_queue_for_active_show();
create or replace function public.get_show_queue_for_active_show()
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
  created_at timestamptz
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
    sub.created_at
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.moderation_status = 'approved'
    and sub.status in ('pending', 'queued', 'played', 'reviewed')
  order by sub.created_at asc;
end;
$$;

create or replace function public.get_url_archive_shows()
returns table (
  show_id uuid,
  show_title text,
  show_date timestamptz,
  ends_at timestamptz,
  theme text,
  venue text,
  submission_count integer,
  nomination_count integer,
  winner_submission_id uuid,
  winner_artist_name text,
  winner_track_title text,
  winner_votes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with archived_shows as (
    select s.*
    from public.shows as s
    where s.ends_at < timezone('utc', now())
    order by s.show_date desc
  ),
  show_submission_counts as (
    select
      sub.show_id,
      count(*)::integer as submission_count
    from public.submissions as sub
    where sub.moderation_status = 'approved'
    group by sub.show_id
  ),
  show_nomination_counts as (
    select
      nom.show_id,
      count(*)::integer as nomination_count
    from public.totn_nominations as nom
    join public.submissions as sub
      on sub.id = nom.submission_id
    where sub.moderation_status = 'approved'
    group by nom.show_id
  ),
  ranked_winners as (
    select
      nom.show_id,
      nom.submission_id,
      nom.artist_name,
      nom.track_title,
      nom.votes,
      row_number() over (
        partition by nom.show_id
        order by nom.votes desc, nom.created_at asc
      ) as winner_rank
    from public.totn_nominations as nom
    join public.submissions as sub
      on sub.id = nom.submission_id
    where sub.moderation_status = 'approved'
  )
  select
    s.id,
    s.title,
    s.show_date,
    s.ends_at,
    s.theme,
    s.venue,
    coalesce(sub_counts.submission_count, 0),
    coalesce(nom_counts.nomination_count, 0),
    winner.submission_id,
    winner.artist_name,
    winner.track_title,
    winner.votes
  from archived_shows as s
  left join show_submission_counts as sub_counts
    on sub_counts.show_id = s.id
  left join show_nomination_counts as nom_counts
    on nom_counts.show_id = s.id
  left join ranked_winners as winner
    on winner.show_id = s.id
   and winner.winner_rank = 1;
end;
$$;

create or replace function public.get_url_archive_show_tracks(
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
  nomination_votes integer
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
    coalesce(nom.votes, 0)
  from public.submissions as sub
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

create or replace function public.search_global_content(
  p_query text
)
returns table (
  result_type text,
  result_id uuid,
  title text,
  snippet text,
  result_date timestamptz,
  href text
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      trim(coalesce(p_query, '')) as q,
      nullif(regexp_replace(trim(coalesce(p_query, '')), '\D', '', 'g'), '') as q_digits
  ),
  show_results as (
    select
      'show'::text as result_type,
      s.id as result_id,
      s.title,
      coalesce(
        nullif(trim(s.description), ''),
        nullif(trim(s.theme), ''),
        nullif(trim(s.venue), ''),
        'Archived show'
      ) as snippet,
      s.show_date as result_date,
      '/archive#archive-show-' || s.id::text as href
    from public.shows as s
    cross join normalized as n
    where
      length(n.q) >= 2
      and s.ends_at < now()
      and (
        s.title ilike '%' || n.q || '%'
        or coalesce(s.description, '') ilike '%' || n.q || '%'
        or coalesce(s.theme, '') ilike '%' || n.q || '%'
        or (
          n.q_digits is not null
          and regexp_replace(s.title, '\D', '', 'g') ilike '%' || n.q_digits || '%'
        )
      )
  ),
  noticeboard_results as (
    select
      'noticeboard'::text as result_type,
      post.id as result_id,
      post.title,
      left(regexp_replace(post.body, '[\r\n]+', ' ', 'g'), 180) as snippet,
      coalesce(post.posted_at, post.created_at) as result_date,
      '/noticeboard#noticeboard-post-' || post.id::text as href
    from public.noticeboard_posts as post
    cross join normalized as n
    where
      length(n.q) >= 2
      and (
        post.title ilike '%' || n.q || '%'
        or post.body ilike '%' || n.q || '%'
      )
  ),
  track_results as (
    select
      'track'::text as result_type,
      sub.id as result_id,
      sub.artist_name || ' - ' || sub.track_title as title,
      coalesce(nullif(trim(sub.message), ''), nullif(trim(sub.genre), ''), 'Track submission')
        || case
          when s.title is not null then ' | ' || s.title
          else ''
        end as snippet,
      sub.created_at as result_date,
      case
        when s.id is not null and s.ends_at < now()
          then '/archive#archive-show-' || s.id::text
        else '/queue'
      end as href
    from public.submissions as sub
    left join public.shows as s
      on s.id = sub.show_id
    cross join normalized as n
    where
      length(n.q) >= 2
      and sub.moderation_status = 'approved'
      and (
        sub.artist_name ilike '%' || n.q || '%'
        or sub.track_title ilike '%' || n.q || '%'
      )
  ),
  combined as (
    select * from show_results
    union all
    select * from noticeboard_results
    union all
    select * from track_results
  ),
  ranked as (
    select
      result_type,
      result_id,
      title,
      snippet,
      result_date,
      href,
      row_number() over (
        partition by result_type
        order by result_date desc nulls last, title asc
      ) as row_number_in_type
    from combined
  )
  select
    result_type,
    result_id,
    title,
    snippet,
    result_date,
    href
  from ranked
  where row_number_in_type <= 8
  order by
    case result_type
      when 'show' then 1
      when 'noticeboard' then 2
      when 'track' then 3
      else 4
    end,
    result_date desc nulls last,
    title asc;
$$;

grant execute on function public.update_own_profile_display_name(text) to authenticated;
grant execute on function public.get_moderation_users() to authenticated;
grant execute on function public.search_moderation_users(text) to authenticated;
grant execute on function public.set_user_account_status(uuid, text) to authenticated;
grant execute on function public.get_moderation_submissions() to authenticated;
grant execute on function public.search_moderation_submissions(text) to authenticated;
grant execute on function public.set_submission_moderation_status(uuid, text) to authenticated;
grant execute on function public.get_recent_moderation_actions() to authenticated;
