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
  target_show public.shows%rowtype;
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
  into target_show
  from public.shows
  where id = target_nomination.show_id;

  if not found then
    raise exception 'Show not found for this nomination.';
  end if;

  if timezone('utc', now()) > target_show.ends_at + interval '72 hours' then
    raise exception 'TOTN voting has now closed for this show.';
  end if;

  if timezone('utc', now()) < target_show.ends_at then
    raise exception 'TOTN voting opens after the show has ended.';
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
  where s.ends_at <= timezone('utc', now())
    and s.ends_at + interval '72 hours' >= timezone('utc', now())
    and s.status in ('scheduled', 'live', 'completed')
  order by s.show_date desc
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

create or replace function public.get_latest_totn_winner()
returns table (
  show_id uuid,
  show_title text,
  artist_name text,
  track_title text,
  votes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with closed_shows as (
    select s.*
    from public.shows as s
    where s.ends_at + interval '72 hours' <= timezone('utc', now())
      and s.status in ('scheduled', 'live', 'completed')
    order by s.show_date desc
  ),
  ranked_winners as (
    select
      s.id as show_id,
      s.title as show_title,
      s.show_date,
      nom.artist_name,
      nom.track_title,
      nom.votes,
      row_number() over (
        partition by s.id
        order by nom.votes desc, nom.created_at asc
      ) as winner_rank
    from closed_shows as s
    join public.totn_nominations as nom
      on nom.show_id = s.id
  )
  select
    winner.show_id,
    winner.show_title,
    winner.artist_name,
    winner.track_title,
    winner.votes
  from ranked_winners as winner
  where winner.winner_rank = 1
  order by winner.show_date desc
  limit 1;
end;
$$;

grant execute on function public.get_latest_totn_winner() to authenticated, anon;
