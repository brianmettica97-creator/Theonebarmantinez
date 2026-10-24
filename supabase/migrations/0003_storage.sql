-- Bucket público SOLO para imágenes destinadas a la web. Escritura restringida a staff.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-images', 'public-images', true, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public-images read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-images');
create policy "public-images staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-images' and public.is_staff());
create policy "public-images staff update" on storage.objects for update to authenticated
  using (bucket_id = 'public-images' and public.is_staff()) with check (bucket_id = 'public-images' and public.is_staff());
create policy "public-images staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-images' and public.is_staff());
