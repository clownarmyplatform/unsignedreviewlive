create table if not exists public.image_moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_email text,
  actor_role text not null
    check (actor_role in ('user', 'admin')),
  target_type text not null
    check (target_type in ('avatar', 'noticeboard_image')),
  related_noticeboard_post_id uuid,
  file_name text,
  file_content_type text not null,
  file_size_bytes integer not null
    check (file_size_bytes > 0),
  file_sha256 text not null,
  moderation_status text not null
    check (moderation_status in ('clean', 'flagged', 'error')),
  ai_moderation_categories jsonb,
  ai_moderation_scores jsonb,
  strongest_category text,
  strongest_score double precision,
  ai_moderation_model text not null,
  ai_moderation_checked_at timestamptz not null,
  ai_moderation_error text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists image_moderation_log_created_at_idx
  on public.image_moderation_log (created_at desc);

create index if not exists image_moderation_log_actor_idx
  on public.image_moderation_log (actor_user_id, created_at desc);

create index if not exists image_moderation_log_target_idx
  on public.image_moderation_log (target_type, moderation_status, created_at desc);

revoke all on table public.image_moderation_log from anon, authenticated;
grant all on table public.image_moderation_log to service_role;

drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

drop policy if exists "Authenticated users can upload noticeboard images" on storage.objects;
drop policy if exists "Authenticated users can update noticeboard images" on storage.objects;
drop policy if exists "Authenticated users can delete noticeboard images" on storage.objects;

revoke all on function public.update_own_profile_avatar(text, text) from public, anon, authenticated;
grant execute on function public.update_own_profile_avatar(text, text) to service_role;

revoke all on function public.create_noticeboard_post(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_noticeboard_post(text, text, text, text, text) to service_role;

revoke all on function public.update_noticeboard_post(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_noticeboard_post(uuid, text, text, text, text, text) to service_role;

revoke all on function public.delete_noticeboard_post(uuid) from public, anon, authenticated;
grant execute on function public.delete_noticeboard_post(uuid) to service_role;
