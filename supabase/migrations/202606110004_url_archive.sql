create or replace function public.get_url_archive_shows()
returns table (
  show_id uuid,
  show_title text,
  show_date timestamptz,
  ends_at timestamptz,
  theme text,
  venue text,
  submission_count integer,
  nomination_count integer,
  winner_submission_id uuid,
  winner_artist_name text,
  winner_track_title text,
  winner_votes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with archived_shows as (
    select s.*
    from public.shows as s
    where s.ends_at < timezone('utc', now())
    order by s.show_date desc
  ),
  show_submission_counts as (
    select
      sub.show_id,
      count(*)::integer as submission_count
    from public.submissions as sub
    group by sub.show_id
  ),
  show_nomination_counts as (
    select
      nom.show_id,
      count(*)::integer as nomination_count
    from public.totn_nominations as nom
    group by nom.show_id
  ),
  ranked_winners as (
    select
      nom.show_id,
      nom.submission_id,
      nom.artist_name,
      nom.track_title,
      nom.votes,
      row_number() over (
        partition by nom.show_id
        order by nom.votes desc, nom.created_at asc
      ) as winner_rank
    from public.totn_nominations as nom
  )
  select
    s.id,
    s.title,
    s.show_date,
    s.ends_at,
    s.theme,
    s.venue,
    coalesce(sub_counts.submission_count, 0),
    coalesce(nom_counts.nomination_count, 0),
    winner.submission_id,
    winner.artist_name,
    winner.track_title,
    winner.votes
  from archived_shows as s
  left join show_submission_counts as sub_counts
    on sub_counts.show_id = s.id
  left join show_nomination_counts as nom_counts
    on nom_counts.show_id = s.id
  left join ranked_winners as winner
    on winner.show_id = s.id
   and winner.winner_rank = 1;
end;
$$;

create or replace function public.get_url_archive_show_tracks(
  p_show_id uuid
)
returns table (
  submission_id uuid,
  artist_name text,
  track_title text,
  genre text,
  status text,
  created_at timestamptz,
  is_totn_nominated boolean,
  is_totn_winner boolean,
  nomination_votes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_show_id is null then
    return;
  end if;

  return query
  with ranked_winners as (
    select
      nom.id,
      nom.submission_id,
      nom.show_id,
      nom.votes,
      row_number() over (
        partition by nom.show_id
        order by nom.votes desc, nom.created_at asc
      ) as winner_rank
    from public.totn_nominations as nom
    where nom.show_id = p_show_id
  )
  select
    sub.id,
    sub.artist_name,
    sub.track_title,
    sub.genre,
    sub.status::text,
    sub.created_at,
    nom.id is not null,
    winner.id is not null,
    coalesce(nom.votes, 0)
  from public.submissions as sub
  left join public.totn_nominations as nom
    on nom.submission_id = sub.id
   and nom.show_id = p_show_id
  left join ranked_winners as winner
    on winner.submission_id = sub.id
   and winner.winner_rank = 1
  where sub.show_id = p_show_id
  order by sub.created_at asc;
end;
$$;

grant execute on function public.get_url_archive_shows() to anon, authenticated;
grant execute on function public.get_url_archive_show_tracks(uuid) to anon, authenticated;
