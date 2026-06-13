create table if not exists public.totn_votes (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.totn_nominations(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  auth_user_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (show_id, auth_user_id)
);

create unique index if not exists totn_nominations_show_submission_idx
  on public.totn_nominations (show_id, submission_id)
  where submission_id is not null;

create index if not exists totn_votes_show_idx
  on public.totn_votes (show_id);

revoke all on table public.totn_votes from anon, authenticated;
grant all on table public.totn_votes to service_role;

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
  on conflict (show_id, submission_id)
  do update set
    artist_name = excluded.artist_name,
    track_title = excluded.track_title
  returning * into target_nomination;

  return target_nomination;
end;
$$;

create or replace function public.cast_totn_vote(
  p_nomination_id uuid
)
returns public.totn_nominations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_nomination public.totn_nominations%rowtype;
  previous_vote public.totn_votes%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to vote.';
  end if;

  if p_nomination_id is null then
    raise exception 'Nomination ID is required.';
  end if;

  select *
  into target_nomination
  from public.totn_nominations
  where id = p_nomination_id;

  if not found then
    raise exception 'Nomination not found.';
  end if;

  select *
  into previous_vote
  from public.totn_votes
  where show_id = target_nomination.show_id
    and auth_user_id = current_user_id;

  if found and previous_vote.nomination_id = p_nomination_id then
    return target_nomination;
  end if;

  if found then
    update public.totn_nominations
    set votes = greatest(votes - 1, 0)
    where id = previous_vote.nomination_id;

    update public.totn_votes
    set nomination_id = p_nomination_id
    where id = previous_vote.id;
  else
    insert into public.totn_votes (
      nomination_id,
      show_id,
      auth_user_id
    )
    values (
      p_nomination_id,
      target_nomination.show_id,
      current_user_id
    );
  end if;

  update public.totn_nominations
  set votes = coalesce(votes, 0) + 1
  where id = p_nomination_id
  returning * into target_nomination;

  return target_nomination;
end;
$$;

create or replace function public.get_totn_board_for_active_show()
returns table (
  nomination_id uuid,
  submission_id uuid,
  show_id uuid,
  show_title text,
  artist_name text,
  track_title text,
  votes integer,
  created_at timestamptz,
  has_user_vote boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_show public.shows%rowtype;
  current_user_id uuid := auth.uid();
  user_vote_nomination_id uuid := null;
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

  if current_user_id is not null then
    select v.nomination_id
    into user_vote_nomination_id
    from public.totn_votes as v
    where v.show_id = target_show.id
      and v.auth_user_id = current_user_id
    limit 1;
  end if;

  return query
  select
    nom.id,
    nom.submission_id,
    nom.show_id,
    target_show.title,
    nom.artist_name,
    nom.track_title,
    nom.votes,
    nom.created_at,
    nom.id = user_vote_nomination_id
  from public.totn_nominations as nom
  where nom.show_id = target_show.id
  order by nom.votes desc, nom.created_at asc;
end;
$$;

grant execute on function public.nominate_submission_for_totn(uuid) to authenticated;
grant execute on function public.cast_totn_vote(uuid) to authenticated;
grant execute on function public.get_totn_board_for_active_show() to authenticated, anon;
