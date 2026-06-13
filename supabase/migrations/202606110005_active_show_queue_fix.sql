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
  where sub.show_id = target_show.id;

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
begin
  if current_user_id is null then
    raise exception 'You must be signed in to submit a track.';
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
  where sub.show_id = target_show.id;

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
    status
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
    'pending'
  )
  returning * into new_submission;

  return new_submission;
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
  where sub.show_id = target_show.id;

  select count(*)
  into current_unplayed_count
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.status in ('pending', 'queued');

  select count(*)
  into current_totn_count
  from public.totn_nominations as nom
  where nom.show_id = target_show.id;

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
  where nom.show_id = target_show.id
  order by nom.votes desc, nom.created_at asc;
end;
$$;

create or replace function public.get_show_queue_for_active_show()
returns table (
  show_id uuid,
  show_title text,
  show_date timestamptz,
  submission_id uuid,
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
    sub.genre,
    sub.status::text,
    sub.created_at
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.status in ('pending', 'queued', 'played', 'reviewed')
  order by sub.created_at asc;
end;
$$;

create or replace function public.create_show(
  p_title text,
  p_show_date timestamptz,
  p_ends_at timestamptz,
  p_submission_deadline timestamptz,
  p_theme text,
  p_venue text
)
returns public.shows
language plpgsql
security definer
set search_path = public
as $$
declare
  new_show public.shows%rowtype;
  resolved_title text;
begin
  if p_show_date is null or p_ends_at is null then
    raise exception 'Start and finish times are required.';
  end if;

  if p_ends_at <= p_show_date then
    raise exception 'Finish time must be after start time.';
  end if;

  resolved_title := nullif(trim(coalesce(p_title, '')), '');

  if resolved_title is null then
    resolved_title := 'Unsigned Review Live ' || to_char(timezone('utc', p_show_date), 'YYYY-MM-DD');
  end if;

  insert into public.shows (
    title,
    show_date,
    ends_at,
    submission_deadline,
    theme,
    venue,
    status
  )
  values (
    resolved_title,
    p_show_date,
    p_ends_at,
    coalesce(p_submission_deadline, p_ends_at),
    nullif(trim(coalesce(p_theme, '')), ''),
    nullif(trim(coalesce(p_venue, '')), ''),
    'scheduled'
  )
  returning * into new_show;

  return new_show;
end;
$$;

create or replace function public.update_show(
  p_show_id uuid,
  p_title text,
  p_show_date timestamptz,
  p_ends_at timestamptz,
  p_submission_deadline timestamptz,
  p_theme text,
  p_venue text
)
returns public.shows
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_show public.shows%rowtype;
begin
  if p_show_id is null then
    raise exception 'Show ID is required.';
  end if;

  if p_show_date is null or p_ends_at is null then
    raise exception 'Start and finish times are required.';
  end if;

  if p_ends_at <= p_show_date then
    raise exception 'Finish time must be after start time.';
  end if;

  update public.shows
  set
    title = coalesce(nullif(trim(coalesce(p_title, '')), ''), title),
    show_date = p_show_date,
    ends_at = p_ends_at,
    submission_deadline = coalesce(p_submission_deadline, p_ends_at),
    theme = nullif(trim(coalesce(p_theme, '')), ''),
    venue = nullif(trim(coalesce(p_venue, '')), '')
  where id = p_show_id
  returning * into updated_show;

  if not found then
    raise exception 'Show not found.';
  end if;

  return updated_show;
end;
$$;
