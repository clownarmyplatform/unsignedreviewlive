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
  where s.status = 'scheduled'
    and s.show_date >= timezone('utc', now())
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

create or replace function public.mark_submission_played(
  p_submission_id uuid
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_submission public.submissions%rowtype;
begin
  update public.submissions
  set status = 'played'
  where id = p_submission_id
  returning * into updated_submission;

  if not found then
    raise exception 'Submission not found.';
  end if;

  return updated_submission;
end;
$$;

grant execute on function public.get_unplayed_submissions_for_upcoming_show() to anon, authenticated;
grant execute on function public.mark_submission_played(uuid) to anon, authenticated;
