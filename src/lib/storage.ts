/**
 * Абстракция хранилища медиафайлов.
 * Сейчас: Supabase Storage.
 * Потом: заменить реализацию на Cloudflare R2 (S3-совместимый),
 * не меняя код вызывающих сторон.
 */
import { createClient as createServerSupabase } from "@/lib/supabase/server";

const BUCKET = "media";
// Подписанные URL живут 1 час — достаточно для сессии просмотра
const SIGNED_URL_TTL = 60 * 60;

/** Генерирует подписанный URL для чтения файла (сервер). */
export async function getSignedUrl(storagePath: string): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error || !data) throw new Error(`storage.getSignedUrl: ${error?.message}`);
  return data.signedUrl;
}

/** Удаляет файл из хранилища (сервер). */
export async function deleteFile(storagePath: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`storage.deleteFile: ${error.message}`);
}
