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
  where s.status = 'scheduled'
    and s.show_date >= timezone('utc', now())
    and (
      s.submission_deadline is null
      or s.submission_deadline >= timezone('utc', now())
    )
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
  updated_submission public.submissions%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to edit a submission.';
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
  returning * into updated_submission;

  if not found then
    raise exception 'Submission not found or can no longer be edited.';
  end if;

  return updated_submission;
end;
$$;

grant execute on function public.update_own_submission(uuid, text, text, text, text, text, boolean) to authenticated;
