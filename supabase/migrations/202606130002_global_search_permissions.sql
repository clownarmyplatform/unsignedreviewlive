create or replace function public.search_global_content(
  p_query text
)
returns table (
  result_type text,
  result_id uuid,
  title text,
  snippet text,
  result_date timestamptz,
  href text
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      trim(coalesce(p_query, '')) as q,
      nullif(regexp_replace(trim(coalesce(p_query, '')), '\D', '', 'g'), '') as q_digits
  ),
  show_results as (
    select
      'show'::text as result_type,
      s.id as result_id,
      s.title,
      coalesce(
        nullif(trim(s.description), ''),
        nullif(trim(s.theme), ''),
        nullif(trim(s.venue), ''),
        'Archived show'
      ) as snippet,
      s.show_date as result_date,
      '/archive#archive-show-' || s.id::text as href
    from public.shows as s
    cross join normalized as n
    where
      length(n.q) >= 2
      and s.ends_at < now()
      and (
        s.title ilike '%' || n.q || '%'
        or coalesce(s.description, '') ilike '%' || n.q || '%'
        or coalesce(s.theme, '') ilike '%' || n.q || '%'
        or (
          n.q_digits is not null
          and regexp_replace(s.title, '\D', '', 'g') ilike '%' || n.q_digits || '%'
        )
      )
  ),
  noticeboard_results as (
    select
      'noticeboard'::text as result_type,
      post.id as result_id,
      post.title,
      left(regexp_replace(post.body, '[\r\n]+', ' ', 'g'), 180) as snippet,
      coalesce(post.posted_at, post.created_at) as result_date,
      '/noticeboard#noticeboard-post-' || post.id::text as href
    from public.noticeboard_posts as post
    cross join normalized as n
    where
      length(n.q) >= 2
      and (
        post.title ilike '%' || n.q || '%'
        or post.body ilike '%' || n.q || '%'
      )
  ),
  track_results as (
    select
      'track'::text as result_type,
      sub.id as result_id,
      sub.artist_name || ' - ' || sub.track_title as title,
      coalesce(nullif(trim(sub.message), ''), nullif(trim(sub.genre), ''), 'Track submission')
        || case
          when s.title is not null then ' | ' || s.title
          else ''
        end as snippet,
      sub.created_at as result_date,
      case
        when s.id is not null and s.ends_at < now()
          then '/archive#archive-show-' || s.id::text
        else '/queue'
      end as href
    from public.submissions as sub
    left join public.shows as s
      on s.id = sub.show_id
    cross join normalized as n
    where
      length(n.q) >= 2
      and (
        sub.artist_name ilike '%' || n.q || '%'
        or sub.track_title ilike '%' || n.q || '%'
      )
  ),
  combined as (
    select * from show_results
    union all
    select * from noticeboard_results
    union all
    select * from track_results
  ),
  ranked as (
    select
      result_type,
      result_id,
      title,
      snippet,
      result_date,
      href,
      row_number() over (
        partition by result_type
        order by result_date desc nulls last, title asc
      ) as row_number_in_type
    from combined
  )
  select
    result_type,
    result_id,
    title,
    snippet,
    result_date,
    href
  from ranked
  where row_number_in_type <= 8
  order by
    case result_type
      when 'show' then 1
      when 'noticeboard' then 2
      when 'track' then 3
      else 4
    end,
    result_date desc nulls last,
    title asc;
$$;

grant execute on function public.search_global_content(text) to anon, authenticated;
