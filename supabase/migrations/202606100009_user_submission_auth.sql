alter table public.submissions
add column if not exists auth_user_id uuid,
add column if not exists submitter_email text;

create index if not exists submissions_auth_user_id_idx
  on public.submissions (auth_user_id, created_at desc);

grant select on table public.submissions to authenticated;

drop policy if exists "authenticated_users_can_view_own_submissions" on public.submissions;
create policy "authenticated_users_can_view_own_submissions"
on public.submissions
for select
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = auth_user_id
);

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
