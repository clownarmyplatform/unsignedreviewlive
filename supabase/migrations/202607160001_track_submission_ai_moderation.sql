alter table public.submissions
  add column if not exists submission_attempt_id uuid,
  add column if not exists ai_moderation_status text default 'unchecked',
  add column if not exists requires_manual_review boolean default false,
  add column if not exists ai_moderation_categories jsonb,
  add column if not exists ai_moderation_scores jsonb,
  add column if not exists ai_moderation_model text,
  add column if not exists ai_moderation_checked_at timestamptz,
  add column if not exists ai_moderation_error text;

update public.submissions
set
  ai_moderation_status = coalesce(ai_moderation_status, 'unchecked'),
  requires_manual_review = coalesce(requires_manual_review, false)
where ai_moderation_status is null
   or requires_manual_review is null;

alter table public.submissions
  alter column ai_moderation_status set default 'unchecked',
  alter column ai_moderation_status set not null,
  alter column requires_manual_review set default false,
  alter column requires_manual_review set not null,
  alter column moderation_status set default 'pending_review';

alter table public.submissions
  drop constraint if exists submissions_moderation_status_check;

alter table public.submissions
  add constraint submissions_moderation_status_check
  check (moderation_status in ('pending_review', 'approved', 'rejected', 'removed'));

alter table public.submissions
  drop constraint if exists submissions_ai_moderation_status_check;

alter table public.submissions
  add constraint submissions_ai_moderation_status_check
  check (ai_moderation_status in ('unchecked', 'clean', 'flagged', 'error'));

create unique index if not exists submissions_auth_user_attempt_idx
  on public.submissions (auth_user_id, submission_attempt_id)
  where auth_user_id is not null
    and submission_attempt_id is not null;

create index if not exists submissions_queue_capacity_idx
  on public.submissions (show_id, moderation_status, created_at desc);

create index if not exists submissions_ai_review_idx
  on public.submissions (requires_manual_review, ai_moderation_status, created_at desc);

revoke execute on function public.create_submission_for_next_show(text, text, text, text, text, boolean) from anon, authenticated;

drop function if exists public.create_submission_after_ai_moderation(uuid, text, text, text, text, text, text, boolean, uuid, text, boolean, jsonb, jsonb, text, timestamptz, text);
create function public.create_submission_after_ai_moderation(
  p_auth_user_id uuid,
  p_submitter_email text,
  p_artist_name text,
  p_track_title text,
  p_track_url text,
  p_genre text,
  p_message text,
  p_rights_confirmed boolean,
  p_submission_attempt_id uuid,
  p_ai_moderation_status text,
  p_requires_manual_review boolean,
  p_ai_moderation_categories jsonb,
  p_ai_moderation_scores jsonb,
  p_ai_moderation_model text,
  p_ai_moderation_checked_at timestamptz,
  p_ai_moderation_error text
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show public.shows%rowtype;
  current_account_status text := 'active';
  submission_count integer;
  max_submissions integer := 30;
  normalized_ai_status text := lower(trim(coalesce(p_ai_moderation_status, 'unchecked')));
  normalized_message text := nullif(trim(coalesce(p_message, '')), '');
  normalized_submitter_email text := lower(nullif(trim(coalesce(p_submitter_email, '')), ''));
  next_requires_manual_review boolean := coalesce(p_requires_manual_review, false);
  existing_submission public.submissions%rowtype;
  new_submission public.submissions%rowtype;
begin
  if p_auth_user_id is null then
    raise exception 'You must be signed in to submit a track.';
  end if;

  if p_submission_attempt_id is null then
    raise exception 'Submission attempt ID is required.';
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

  if normalized_ai_status not in ('unchecked', 'clean', 'flagged', 'error') then
    raise exception 'Invalid AI moderation status.';
  end if;

  if normalized_ai_status in ('flagged', 'error') then
    next_requires_manual_review := true;
  end if;

  select profile.account_status
  into current_account_status
  from public.user_profiles as profile
  where profile.auth_user_id = p_auth_user_id;

  if current_account_status = 'suspended' then
    raise exception 'Your account is suspended. Track submission is unavailable.';
  end if;

  select sub.*
  into existing_submission
  from public.submissions as sub
  where sub.auth_user_id = p_auth_user_id
    and sub.submission_attempt_id = p_submission_attempt_id
  order by sub.created_at desc
  limit 1;

  if found then
    return existing_submission;
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

  select sub.*
  into existing_submission
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.auth_user_id = p_auth_user_id
  order by sub.created_at asc
  limit 1;

  if found then
    raise exception 'You already have a track submitted for this show. Please edit your existing submission instead.';
  end if;

  select count(*)
  into submission_count
  from public.submissions as sub
  where sub.show_id = target_show.id
    and sub.moderation_status in ('pending_review', 'approved');

  if submission_count >= max_submissions then
    raise exception 'Sorry, the queue for this show is full';
  end if;

  begin
    insert into public.submissions (
      show_id,
      auth_user_id,
      submitter_email,
      submission_attempt_id,
      artist_name,
      track_title,
      track_url,
      genre,
      message,
      rights_confirmed,
      status,
      moderation_status,
      requires_manual_review,
      ai_moderation_status,
      ai_moderation_categories,
      ai_moderation_scores,
      ai_moderation_model,
      ai_moderation_checked_at,
      ai_moderation_error
    )
    values (
      target_show.id,
      p_auth_user_id,
      normalized_submitter_email,
      p_submission_attempt_id,
      trim(p_artist_name),
      trim(p_track_title),
      trim(p_track_url),
      trim(p_genre),
      normalized_message,
      true,
      'pending',
      'pending_review',
      next_requires_manual_review,
      normalized_ai_status,
      p_ai_moderation_categories,
      p_ai_moderation_scores,
      nullif(trim(coalesce(p_ai_moderation_model, '')), ''),
      p_ai_moderation_checked_at,
      nullif(trim(coalesce(p_ai_moderation_error, '')), '')
    )
    returning * into new_submission;
  exception
    when unique_violation then
      select sub.*
      into existing_submission
      from public.submissions as sub
      where sub.auth_user_id = p_auth_user_id
        and sub.submission_attempt_id = p_submission_attempt_id
      order by sub.created_at desc
      limit 1;

      if found then
        return existing_submission;
      end if;

      raise;
  end;

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
    and moderation_status in ('pending_review', 'approved')
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
    and sub.moderation_status in ('pending_review', 'approved');

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
    and sub.moderation_status in ('pending_review', 'approved');

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

drop function if exists public.get_moderation_submissions();
create function public.get_moderation_submissions()
returns table (
  submission_id uuid,
  artist_name text,
  track_title text,
  genre text,
  track_url text,
  message text,
  submitter text,
  submitter_email text,
  submitter_avatar_url text,
  show_id uuid,
  show_title text,
  created_at timestamptz,
  moderation_status text,
  queue_status text,
  requires_manual_review boolean,
  ai_moderation_status text,
  ai_moderation_categories jsonb,
  ai_moderation_scores jsonb,
  ai_moderation_model text,
  ai_moderation_checked_at timestamptz,
  ai_moderation_error text
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
    sub.genre,
    sub.track_url,
    sub.message,
    coalesce(profile.display_name, sub.submitter_email, 'Unknown submitter'),
    sub.submitter_email,
    profile.avatar_url,
    sub.show_id,
    show_record.title,
    sub.created_at,
    sub.moderation_status,
    sub.status::text,
    sub.requires_manual_review,
    sub.ai_moderation_status,
    sub.ai_moderation_categories,
    sub.ai_moderation_scores,
    sub.ai_moderation_model,
    sub.ai_moderation_checked_at,
    sub.ai_moderation_error
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
  genre text,
  track_url text,
  message text,
  submitter text,
  submitter_email text,
  submitter_avatar_url text,
  show_id uuid,
  show_title text,
  created_at timestamptz,
  moderation_status text,
  queue_status text,
  requires_manual_review boolean,
  ai_moderation_status text,
  ai_moderation_categories jsonb,
  ai_moderation_scores jsonb,
  ai_moderation_model text,
  ai_moderation_checked_at timestamptz,
  ai_moderation_error text
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
    sub.genre,
    sub.track_url,
    sub.message,
    coalesce(profile.display_name, sub.submitter_email, 'Unknown submitter'),
    sub.submitter_email,
    profile.avatar_url,
    sub.show_id,
    show_record.title,
    sub.created_at,
    sub.moderation_status,
    sub.status::text,
    sub.requires_manual_review,
    sub.ai_moderation_status,
    sub.ai_moderation_categories,
    sub.ai_moderation_scores,
    sub.ai_moderation_model,
    sub.ai_moderation_checked_at,
    sub.ai_moderation_error
  from public.submissions as sub
  left join public.user_profiles as profile
    on profile.auth_user_id = sub.auth_user_id
  left join public.shows as show_record
    on show_record.id = sub.show_id
  where
    sub.artist_name ilike '%' || trimmed_query || '%'
    or sub.track_title ilike '%' || trimmed_query || '%'
    or sub.genre ilike '%' || trimmed_query || '%'
    or coalesce(sub.message, '') ilike '%' || trimmed_query || '%'
    or coalesce(profile.display_name, '') ilike '%' || trimmed_query || '%'
    or coalesce(sub.submitter_email, '') ilike '%' || trimmed_query || '%'
  order by sub.created_at desc;
end;
$$;

drop function if exists public.set_submission_moderation_status(uuid, text);
create function public.set_submission_moderation_status(
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

  if normalized_status not in ('pending_review', 'approved', 'rejected', 'removed') then
    raise exception 'Invalid moderation status.';
  end if;

  update public.submissions
  set
    moderation_status = normalized_status,
    requires_manual_review = normalized_status = 'pending_review',
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
      when 'pending_review' then 'submission_returned_to_review'
      else 'submission_approved'
    end
  );

  return updated_submission;
end;
$$;

grant execute on function public.create_submission_after_ai_moderation(uuid, text, text, text, text, text, text, boolean, uuid, text, boolean, jsonb, jsonb, text, timestamptz, text) to service_role;
grant execute on function public.get_moderation_submissions() to authenticated;
grant execute on function public.search_moderation_submissions(text) to authenticated;
grant execute on function public.set_submission_moderation_status(uuid, text) to authenticated;
