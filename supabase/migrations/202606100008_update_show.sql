create or replace function public.update_show(
  p_show_id uuid,
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
  updated_show public.shows%rowtype;
begin
  if p_show_id is null then
    raise exception 'Show ID is required.';
  end if;

  if p_show_date is null or p_ends_at is null then
    raise exception 'Start and finish times are required.';
  end if;

  if p_ends_at <= p_show_date then
    raise exception 'Finish time must be after start time.';
  end if;

  update public.shows
  set
    title = coalesce(nullif(trim(coalesce(p_title, '')), ''), title),
    show_date = p_show_date,
    ends_at = p_ends_at,
    submission_deadline = p_submission_deadline,
    theme = nullif(trim(coalesce(p_theme, '')), ''),
    venue = nullif(trim(coalesce(p_venue, '')), '')
  where id = p_show_id
  returning * into updated_show;

  if not found then
    raise exception 'Show not found.';
  end if;

  return updated_show;
end;
$$;

grant execute on function public.update_show(uuid, text, timestamptz, timestamptz, timestamptz, text, text) to anon, authenticated;
