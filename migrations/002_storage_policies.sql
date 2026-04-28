-- ============================================================
-- Storage policies pro bucket "invoices"
-- Storage má vlastní RLS oddělené od tabulek — bez těchto policy
-- nejde nahrávat/mazat soubory ani s autentizovaným userem.
-- ============================================================

-- Upload (insert) — jen přihlášení uživatelé
create policy "invoices_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'invoices');

-- Update — jen přihlášení uživatelé
create policy "invoices_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'invoices')
  with check (bucket_id = 'invoices');

-- Delete — jen přihlášení uživatelé
create policy "invoices_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'invoices');

-- Read (select) — kdokoliv (bucket je public, signed URLs i přímý přístup)
create policy "invoices_public_select"
  on storage.objects for select
  using (bucket_id = 'invoices');
