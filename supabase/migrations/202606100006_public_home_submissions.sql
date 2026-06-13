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

grant execute on function public.get_public_recent_submissions() to anon, authenticated;
