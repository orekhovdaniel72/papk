"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ShareLink = {
  id: string;
  resume_id: string;
  slug: string;
  password_hash: string | null;
  expires_at: string | null;
  view_limit: number | null;
  view_count: number;
  revoked: boolean;
  created_at: string;
};

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  // crypto.getRandomValues не доступен в server context напрямую, используем Math.random для slug
  // slug не является секретом — это просто читаемый идентификатор
  for (let i = 0; i < 10; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function listShareLinks(resumeId: string): Promise<ShareLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("share_links")
    .select("*")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function createShareLink(
  resumeId: string,
  opts: { password?: string; expiresAt?: string; viewLimit?: number }
): Promise<{ id?: string; slug?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  let slug = generateSlug();
  // повтор при коллизии
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("share_links")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = generateSlug();
  }

  const password_hash = opts.password ? await hashPassword(opts.password) : null;

  const { data, error } = await supabase
    .from("share_links")
    .insert({
      resume_id: resumeId,
      owner_id: user.id,
      slug,
      password_hash,
      expires_at: opts.expiresAt ?? null,
      view_limit: opts.viewLimit ?? null,
    })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/admin/resumes/${resumeId}`);
  return { id: data.id, slug: data.slug };
}

export async function revokeShareLink(
  linkId: string,
  resumeId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("share_links")
    .update({ revoked: true })
    .eq("id", linkId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/resumes/${resumeId}`);
  return {};
}

export async function deleteShareLink(
  linkId: string,
  resumeId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("share_links")
    .delete()
    .eq("id", linkId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/resumes/${resumeId}`);
  return {};
}

// Публичная функция — без auth, используется на /r/[slug]
export async function resolveShareLink(slug: string): Promise<{
  link?: ShareLink & { resume_id: string };
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("share_links")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return { error: "Ссылка не найдена" };
  if (data.revoked) return { error: "Ссылка отозвана" };
  if (data.expires_at && new Date(data.expires_at) < new Date())
    return { error: "Ссылка истекла" };
  if (data.view_limit !== null && data.view_count >= data.view_limit)
    return { error: "Лимит просмотров исчерпан" };

  return { link: data };
}

export async function incrementViewCount(linkId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_share_link_view_count", { link_id: linkId });
}
