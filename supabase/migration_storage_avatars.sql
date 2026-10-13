-- Políticas do bucket 'avatars' (Supabase Storage).
-- Rode no SQL Editor do Supabase. Bucket público libera apenas LEITURA;
-- estas policies permitem que usuários autenticados enviem/editem/apaguem
-- arquivos do bucket 'avatars'.

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
