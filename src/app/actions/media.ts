"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteFile, getSignedUrl } from "@/lib/storage";

export type MediaAsset = {
  id: string;
  name: string;
  type: "image" | "video";
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  tags: string[];
  description: string;
  created_at: string;
  signedUrl?: string;
  projectCount: number;
  resumeCount: number;
};

/** Возвращает список медиафайлов владельца с подписанными URL. */
export async function listAssets(): Promise<MediaAsset[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("media_assets")
    .select("id, name, type, storage_path, size_bytes, mime_type, tags, description, created_at, project_items(count), resume_items(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Подписываем URL параллельно
  const assets = await Promise.all(
    data.map(async (a) => ({
      ...a,
      projectCount: (a.project_items as unknown as [{ count: number }])[0]?.count ?? 0,
      resumeCount: (a.resume_items as unknown as [{ count: number }])[0]?.count ?? 0,
      signedUrl: await getSignedUrl(a.storage_path).catch(() => undefined),
    }))
  );

  return assets as MediaAsset[];
}

/** Сохраняет метаданные после успешной загрузки файла в Storage. */
export async function saveAsset(input: {
  name: string;
  type: "image" | "video";
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration_sec?: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase.from("media_assets").insert({
    owner_id: user.id,
    ...input,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/media");
  return {};
}

/** Удаляет файл из Storage и запись из БД. */
export async function deleteAsset(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: asset } = await supabase
    .from("media_assets")
    .select("storage_path")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!asset) return { error: "Файл не найден" };

  await deleteFile(asset.storage_path);

  await supabase.from("media_assets").delete().eq("id", id).eq("owner_id", user.id);

  revalidatePath("/admin/media");
  return {};
}
