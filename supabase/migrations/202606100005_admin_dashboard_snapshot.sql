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
  where s.status = 'scheduled'
    and s.show_date >= timezone('utc', now())
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

grant execute on function public.get_admin_dashboard_snapshot() to anon, authenticated;
