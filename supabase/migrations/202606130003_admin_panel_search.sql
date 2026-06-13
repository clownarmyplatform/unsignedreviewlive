create or replace function public.search_upcoming_shows_for_admin(
  p_query text
)
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
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      trim(coalesce(p_query, '')) as q,
      nullif(regexp_replace(trim(coalesce(p_query, '')), '\D', '', 'g'), '') as q_digits
  )
  select
    s.id,
    s.title,
    s.show_date,
    s.ends_at,
    s.submission_deadline,
    s.theme,
    s.venue,
    s.status::text,
    s.created_at
  from public.shows as s
  cross join normalized as n
  where
    s.status in ('scheduled', 'live')
    and s.ends_at >= timezone('utc', now())
    and length(n.q) >= 2
    and (
      s.title ilike '%' || n.q || '%'
      or s.status::text ilike '%' || n.q || '%'
      or to_char(s.show_date at time zone 'utc', 'DD/MM/YYYY HH24:MI') ilike '%' || n.q || '%'
      or to_char(s.show_date at time zone 'utc', 'YYYY-MM-DD') ilike '%' || n.q || '%'
      or (
        n.q_digits is not null
        and regexp_replace(s.title, '\D', '', 'g') ilike '%' || n.q_digits || '%'
      )
    )
  order by s.show_date asc;
$$;

create or replace function public.search_noticeboard_posts_admin(
  p_query text
)
returns table (
  id uuid,
  title text,
  body text,
  tag text,
  image_url text,
  image_path text,
  posted_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select trim(coalesce(p_query, '')) as q
  )
  select
    post.id,
    post.title,
    post.body,
    post.tag,
    post.image_url,
    post.image_path,
    post.posted_at,
    post.created_at
  from public.noticeboard_posts as post
  cross join normalized as n
  where
    length(n.q) >= 2
    and (
      post.title ilike '%' || n.q || '%'
      or post.body ilike '%' || n.q || '%'
      or coalesce(post.tag, '') ilike '%' || n.q || '%'
      or 'live' ilike '%' || n.q || '%'
      or 'published' ilike '%' || n.q || '%'
      or to_char(coalesce(post.posted_at, post.created_at) at time zone 'utc', 'DD/MM/YYYY HH24:MI') ilike '%' || n.q || '%'
      or to_char(coalesce(post.posted_at, post.created_at) at time zone 'utc', 'YYYY-MM-DD') ilike '%' || n.q || '%'
    )
  order by post.posted_at desc, post.created_at desc;
$$;

grant execute on function public.search_upcoming_shows_for_admin(text) to anon, authenticated;
grant execute on function public.search_noticeboard_posts_admin(text) to anon, authenticated;
