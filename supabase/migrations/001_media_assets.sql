-- ============================================================
-- Миграция 001: таблица медиатеки
-- Запусти в Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Таблица метаданных медиафайлов
create table if not exists media_assets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  type          text not null check (type in ('image', 'video')),
  storage_path  text not null unique,   -- путь в Supabase Storage: {uid}/{filename}
  size_bytes    bigint,
  mime_type     text,
  width         int,                    -- px (для изображений)
  height        int,
  duration_sec  numeric,                -- секунды (для видео)
  tags          text[] default '{}',
  description   text default '',
  created_at    timestamptz default now()
);

-- RLS: только владелец видит и управляет своими файлами
alter table media_assets enable row level security;

create policy "owner_all" on media_assets
  for all
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================
-- Storage bucket + политики (выполни отдельным блоком если нужно)
-- ВАЖНО: сначала создай bucket 'media' через
--   Supabase Dashboard → Storage → New bucket
--   Name: media, Public: OFF
-- Затем запусти эти политики:
-- ============================================================

-- Владелец может загружать файлы в свою папку
create policy "owner_upload" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Владелец может читать свои файлы
create policy "owner_select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'media' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Владелец может удалять свои файлы
create policy "owner_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
