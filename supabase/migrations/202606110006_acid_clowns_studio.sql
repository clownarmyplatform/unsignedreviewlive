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
    and sub.status in ('pending', 'queued', 'played', 'reviewed')
  order by sub.created_at asc;
end;
$$;

create or replace function public.mark_submission_reviewed(
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
  set status = 'reviewed'
  where id = p_submission_id
  returning * into updated_submission;

  if not found then
    raise exception 'Submission not found.';
  end if;

  return updated_submission;
end;
$$;

grant execute on function public.mark_submission_reviewed(uuid) to anon, authenticated;
