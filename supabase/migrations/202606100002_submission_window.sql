revoke insert on table public.submissions from anon, authenticated;

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
  select *
  into target_show
  from public.shows
  where status = 'scheduled'
    and show_date >= timezone('utc', now())
    and (
      submission_deadline is null
      or submission_deadline >= timezone('utc', now())
    )
  order by show_date asc
  limit 1;

  if not found then
    return;
  end if;

  select count(*)
  into submission_count
  from public.submissions
  where show_id = target_show.id;

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
  new_submission public.submissions%rowtype;
  max_submissions integer := 30;
begin
  if coalesce(trim(p_artist_name), '') = ''
    or coalesce(trim(p_track_title), '') = ''
    or coalesce(trim(p_track_url), '') = ''
    or coalesce(trim(p_genre), '') = '' then
    raise exception 'Missing required submission fields.';
  end if;

  if p_rights_confirmed is distinct from true then
    raise exception 'Rights must be confirmed before submitting.';
  end if;

  select *
  into target_show
  from public.shows
  where status = 'scheduled'
    and show_date >= timezone('utc', now())
    and (
      submission_deadline is null
      or submission_deadline >= timezone('utc', now())
    )
  order by show_date asc
  limit 1
  for update;

  if not found then
    raise exception 'No upcoming show is currently accepting submissions.';
  end if;

  select count(*)
  into submission_count
  from public.submissions
  where show_id = target_show.id;

  if submission_count >= max_submissions then
    raise exception 'Sorry, the queue for this show is full';
  end if;

  insert into public.submissions (
    show_id,
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

grant execute on function public.get_submission_window_status() to anon, authenticated;
grant execute on function public.create_submission_for_next_show(text, text, text, text, text, boolean) to anon, authenticated;
