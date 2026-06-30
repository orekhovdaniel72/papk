"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";

export type Resume = {
  id: string;
  title: string;
  about: string | null;
  created_at: string;
  item_count: number;
};

export type ResumeContact = {
  id: string;
  resume_id: string;
  label: string;
  value: string;
  type: "text" | "url" | "phone" | "email";
  position: number;
};

export type ResumeItem = {
  id: string;
  resume_id: string;
  project_id: string;
  asset_id: string;
  position: number;
  caption: string | null;
  signedUrl?: string;
  asset_name: string;
  asset_type: "image" | "video";
  project_title: string;
};

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function listResumes(): Promise<Resume[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, about, created_at, resume_items(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    about: r.about,
    created_at: r.created_at,
    item_count: (r.resume_items as unknown as [{ count: number }])[0]?.count ?? 0,
  }));
}

export async function getResume(id: string): Promise<Resume | null> {
  const { supabase, user } = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("id, title, about, created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!data) return null;
  return { ...data, item_count: 0 };
}

export async function createResume(title: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data, error } = await supabase
    .from("resumes")
    .insert({ owner_id: user.id, title })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Ошибка" };
  revalidatePath("/admin/resumes");
  return { id: data.id };
}

export async function updateResume(
  id: string,
  patch: { title?: string; about?: string }
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("resumes")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/resumes");
  revalidatePath(`/admin/resumes/${id}`);
  return {};
}

export async function deleteResume(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/resumes");
  return {};
}

export async function duplicateResume(id: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: orig } = await supabase
    .from("resumes")
    .select("title, about")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!orig) return { error: "Не найдено" };

  const { data: copy, error: err } = await supabase
    .from("resumes")
    .insert({ owner_id: user.id, title: `${orig.title} (копия)`, about: orig.about })
    .select("id")
    .single();
  if (err || !copy) return { error: err?.message };

  const [{ data: contacts }, { data: items }] = await Promise.all([
    supabase.from("resume_contacts").select("label,value,type,position").eq("resume_id", id),
    supabase.from("resume_items").select("project_id,asset_id,position,caption").eq("resume_id", id),
  ]);

  const [contactsResult, itemsResult] = await Promise.all([
    contacts?.length
      ? supabase.from("resume_contacts").insert(contacts.map((c) => ({ resume_id: copy.id, ...c })))
      : Promise.resolve({ error: null }),
    items?.length
      ? supabase.from("resume_items").insert(items.map((i) => ({ resume_id: copy.id, ...i })))
      : Promise.resolve({ error: null }),
  ]);
  if (contactsResult.error) return { error: contactsResult.error.message };
  if (itemsResult.error) return { error: itemsResult.error.message };

  revalidatePath("/admin/resumes");
  return { id: copy.id };
}

export async function listResumeContacts(resumeId: string): Promise<ResumeContact[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("resume_contacts")
    .select("id, resume_id, label, value, type, position")
    .eq("resume_id", resumeId)
    .order("position");
  return (data ?? []) as ResumeContact[];
}

export async function saveResumeContacts(
  resumeId: string,
  contacts: { label: string; value: string; type: string }[]
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };
  await supabase.from("resume_contacts").delete().eq("resume_id", resumeId);

  if (contacts.length > 0) {
    const { error } = await supabase.from("resume_contacts").insert(
      contacts.map((c, i) => ({ resume_id: resumeId, ...c, position: i }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/resumes/${resumeId}`);
  return {};
}

export async function listResumeItems(resumeId: string): Promise<ResumeItem[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resume_items")
    .select("id, resume_id, project_id, asset_id, position, caption, media_assets(name, type, storage_path), projects(title)")
    .eq("resume_id", resumeId)
    .order("position");

  if (error || !data) return [];

  return Promise.all(
    data.map(async (item) => {
      const a = item.media_assets as unknown as { name: string; type: string; storage_path: string } | null;
      const p = item.projects as unknown as { title: string } | null;
      return {
        id: item.id,
        resume_id: item.resume_id,
        project_id: item.project_id,
        asset_id: item.asset_id,
        position: item.position,
        caption: item.caption,
        asset_name: a?.name ?? "",
        asset_type: (a?.type ?? "image") as "image" | "video",
        project_title: p?.title ?? "",
        signedUrl: a?.storage_path ? await getSignedUrl(a.storage_path).catch(() => undefined) : undefined,
      };
    })
  );
}

export async function addResumeItems(
  resumeId: string,
  items: { projectId: string; assetId: string }[]
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: existing } = await supabase
    .from("resume_items")
    .select("position")
    .eq("resume_id", resumeId)
    .order("position", { ascending: false })
    .limit(1);

  const start = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("resume_items").insert(
    items.map(({ projectId, assetId }, i) => ({
      resume_id: resumeId,
      project_id: projectId,
      asset_id: assetId,
      position: start + i,
    }))
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/resumes/${resumeId}`);
  return {};
}

export async function removeResumeItem(itemId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };
  const { error } = await supabase.from("resume_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}

export async function reorderResumeItems(
  items: { id: string; position: number }[]
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };
  const updates = await Promise.all(
    items.map(({ id, position }) =>
      supabase.from("resume_items").update({ position }).eq("id", id)
    )
  );
  const failed = updates.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  return {};
}

export async function updateResumeItemCaption(
  itemId: string,
  caption: string | null
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };
  const { error } = await supabase.from("resume_items").update({ caption }).eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}
