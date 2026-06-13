alter table public.shows
add column if not exists ends_at timestamptz;

update public.shows
set ends_at = show_date + interval '2 hours 30 minutes'
where ends_at is null;

alter table public.shows
alter column ends_at set not null;

create or replace function public.create_show(
  p_title text,
  p_show_date timestamptz,
  p_ends_at timestamptz,
  p_submission_deadline timestamptz,
  p_theme text,
  p_venue text
)
returns public.shows
language plpgsql
security definer
set search_path = public
as $$
declare
  new_show public.shows%rowtype;
  resolved_title text;
begin
  if p_show_date is null or p_ends_at is null then
    raise exception 'Start and finish times are required.';
  end if;

  if p_ends_at <= p_show_date then
    raise exception 'Finish time must be after start time.';
  end if;

  resolved_title := nullif(trim(coalesce(p_title, '')), '');

  if resolved_title is null then
    resolved_title := 'Unsigned Review Live ' || to_char(timezone('utc', p_show_date), 'YYYY-MM-DD');
  end if;

  insert into public.shows (
    title,
    show_date,
    ends_at,
    submission_deadline,
    theme,
    venue,
    status
  )
  values (
    resolved_title,
    p_show_date,
    p_ends_at,
    p_submission_deadline,
    nullif(trim(coalesce(p_theme, '')), ''),
    nullif(trim(coalesce(p_venue, '')), ''),
    'scheduled'
  )
  returning * into new_show;

  return new_show;
end;
$$;

grant execute on function public.create_show(text, timestamptz, timestamptz, timestamptz, text, text) to anon, authenticated;
