insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'noticeboard-images',
  'noticeboard-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Noticeboard images are publicly readable" on storage.objects;
create policy "Noticeboard images are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'noticeboard-images');

drop policy if exists "Authenticated users can upload noticeboard images" on storage.objects;
create policy "Authenticated users can upload noticeboard images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'noticeboard-images');

drop policy if exists "Authenticated users can update noticeboard images" on storage.objects;
create policy "Authenticated users can update noticeboard images"
on storage.objects
for update
to authenticated
using (bucket_id = 'noticeboard-images')
with check (bucket_id = 'noticeboard-images');

drop policy if exists "Authenticated users can delete noticeboard images" on storage.objects;
create policy "Authenticated users can delete noticeboard images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'noticeboard-images');

alter table public.noticeboard_posts
add column if not exists image_url text,
add column if not exists image_path text;

create index if not exists noticeboard_posts_posted_at_idx
  on public.noticeboard_posts (posted_at desc);

create or replace function public.get_noticeboard_posts()
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
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
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
  order by post.posted_at desc, post.created_at desc;
end;
$$;

create or replace function public.create_noticeboard_post(
  p_title text,
  p_body text,
  p_tag text,
  p_image_url text,
  p_image_path text
)
returns public.noticeboard_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  new_post public.noticeboard_posts%rowtype;
begin
  if coalesce(trim(p_title), '') = '' then
    raise exception 'Noticeboard title is required.';
  end if;

  if coalesce(trim(p_body), '') = '' then
    raise exception 'Noticeboard body is required.';
  end if;

  insert into public.noticeboard_posts (
    title,
    body,
    tag,
    image_url,
    image_path,
    posted_at
  )
  values (
    trim(p_title),
    trim(p_body),
    nullif(trim(coalesce(p_tag, '')), ''),
    nullif(trim(coalesce(p_image_url, '')), ''),
    nullif(trim(coalesce(p_image_path, '')), ''),
    timezone('utc', now())
  )
  returning * into new_post;

  return new_post;
end;
$$;

create or replace function public.update_noticeboard_post(
  p_post_id uuid,
  p_title text,
  p_body text,
  p_tag text,
  p_image_url text,
  p_image_path text
)
returns public.noticeboard_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_post public.noticeboard_posts%rowtype;
begin
  if p_post_id is null then
    raise exception 'Post ID is required.';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Noticeboard title is required.';
  end if;

  if coalesce(trim(p_body), '') = '' then
    raise exception 'Noticeboard body is required.';
  end if;

  update public.noticeboard_posts
  set
    title = trim(p_title),
    body = trim(p_body),
    tag = nullif(trim(coalesce(p_tag, '')), ''),
    image_url = nullif(trim(coalesce(p_image_url, '')), ''),
    image_path = nullif(trim(coalesce(p_image_path, '')), ''),
    posted_at = timezone('utc', now())
  where id = p_post_id
  returning * into updated_post;

  if not found then
    raise exception 'Noticeboard post not found.';
  end if;

  return updated_post;
end;
$$;

create or replace function public.delete_noticeboard_post(
  p_post_id uuid
)
returns public.noticeboard_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_post public.noticeboard_posts%rowtype;
begin
  if p_post_id is null then
    raise exception 'Post ID is required.';
  end if;

  delete from public.noticeboard_posts
  where id = p_post_id
  returning * into deleted_post;

  if not found then
    raise exception 'Noticeboard post not found.';
  end if;

  return deleted_post;
end;
$$;

grant execute on function public.get_noticeboard_posts() to anon, authenticated;
grant execute on function public.create_noticeboard_post(text, text, text, text, text) to authenticated;
grant execute on function public.update_noticeboard_post(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.delete_noticeboard_post(uuid) to authenticated;
