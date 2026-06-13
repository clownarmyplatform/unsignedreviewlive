create or replace function public.search_moderation_users(
  p_query text
)
returns table (
  auth_user_id uuid,
  display_name text,
  email text,
  created_at timestamptz,
  submission_count integer,
  account_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_moderator_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  trimmed_query text := trim(coalesce(p_query, ''));
begin
  if not public.is_admin_email(current_moderator_email) then
    raise exception 'Admin access required.';
  end if;

  if length(trimmed_query) < 2 then
    return;
  end if;

  return query
  select
    profile.auth_user_id,
    profile.display_name,
    profile.email,
    profile.created_at,
    count(sub.id)::integer as submission_count,
    profile.account_status
  from public.user_profiles as profile
  left join public.submissions as sub
    on sub.auth_user_id = profile.auth_user_id
  where
    coalesce(profile.display_name, '') ilike '%' || trimmed_query || '%'
    or profile.email ilike '%' || trimmed_query || '%'
    or profile.account_status ilike '%' || trimmed_query || '%'
  group by
    profile.auth_user_id,
    profile.display_name,
    profile.email,
    profile.created_at,
    profile.account_status
  order by profile.created_at desc;
end;
$$;

grant execute on function public.search_moderation_users(text) to authenticated;
