create or replace function public.nominate_submission_for_totn(
  p_submission_id uuid
)
returns public.totn_nominations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_submission public.submissions%rowtype;
  target_nomination public.totn_nominations%rowtype;
begin
  if p_submission_id is null then
    raise exception 'Submission ID is required.';
  end if;

  select *
  into target_submission
  from public.submissions
  where id = p_submission_id;

  if not found then
    raise exception 'Submission not found.';
  end if;

  if target_submission.show_id is null then
    raise exception 'Submission is not attached to a show.';
  end if;

  select *
  into target_nomination
  from public.totn_nominations
  where show_id = target_submission.show_id
    and submission_id = target_submission.id
  limit 1;

  if found then
    update public.totn_nominations
    set
      artist_name = target_submission.artist_name,
      track_title = target_submission.track_title
    where id = target_nomination.id
    returning * into target_nomination;

    return target_nomination;
  end if;

  insert into public.totn_nominations (
    submission_id,
    show_id,
    artist_name,
    track_title,
    votes
  )
  values (
    target_submission.id,
    target_submission.show_id,
    target_submission.artist_name,
    target_submission.track_title,
    0
  )
  returning * into target_nomination;

  return target_nomination;
end;
$$;
