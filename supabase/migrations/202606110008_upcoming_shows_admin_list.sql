create or replace function public.get_upcoming_shows_for_admin()
returns table (
  id uuid,
  title text,
  show_date timestamptz,
  ends_at timestamptz,
  submission_deadline timestamptz,
  theme text,
  venue text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    s.id,
    s.title,
    s.show_date,
    s.ends_at,
    s.submission_deadline,
    s.theme,
    s.venue,
    s.status,
    s.created_at
  from public.shows as s
  where s.status in ('scheduled', 'live')
    and s.ends_at >= timezone('utc', now())
  order by s.show_date asc;
end;
$$;

grant execute on function public.get_upcoming_shows_for_admin() to anon, authenticated;
