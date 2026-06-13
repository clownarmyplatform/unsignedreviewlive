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
  where s.status = 'scheduled'
    and s.show_date >= timezone('utc', now())
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

grant execute on function public.get_show_queue_for_active_show() to anon, authenticated;
