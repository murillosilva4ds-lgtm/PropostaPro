-- =========================================================
-- Storage — bucket para logotipos das empresas
-- Execute após o schema.sql, ou crie o bucket "logos" manualmente
-- pelo Supabase Dashboard > Storage > New bucket (marque como público)
-- =========================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Cada usuário só pode enviar/alterar arquivos dentro da própria pasta (user_id/)
create policy "Usuário envia seu próprio logotipo"
  on storage.objects for insert
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário atualiza seu próprio logotipo"
  on storage.objects for update
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário remove seu próprio logotipo"
  on storage.objects for delete
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura pública (necessária para o logotipo aparecer no PDF e na página pública)
create policy "Qualquer pessoa pode visualizar logotipos"
  on storage.objects for select
  using (bucket_id = 'logos');
