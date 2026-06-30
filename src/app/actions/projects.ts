"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  item_count: number;
};

export type ProjectItem = {
  id: string;
  project_id: string;
  asset_id: string;
  position: number;
  caption: string | null;
  signedUrl?: string;
  asset_name: string;
  asset_type: "image" | "video";
};

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function listProjects(): Promise<Project[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, created_at, project_items(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    created_at: p.created_at,
    item_count: (p.project_items as unknown as [{ count: number }])[0]?.count ?? 0,
  }));
}

export async function createProject(title: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Ошибка создания" };
  revalidatePath("/admin/projects");
  return { id: data.id };
}

export async function updateProject(
  id: string,
  patch: { title?: string; description?: string }
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  return {};
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/projects");
  return {};
}

export async function duplicateProject(id: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: orig } = await supabase
    .from("projects")
    .select("title, description")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!orig) return { error: "Не найдено" };

  const { data: copy, error: err } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title: `${orig.title} (копия)`, description: orig.description })
    .select("id")
    .single();
  if (err || !copy) return { error: err?.message };

  const { data: items } = await supabase
    .from("project_items")
    .select("asset_id, position, caption")
    .eq("project_id", id);

  if (items?.length) {
    await supabase.from("project_items").insert(
      items.map((i) => ({ project_id: copy.id, ...i }))
    );
  }

  revalidatePath("/admin/projects");
  return { id: copy.id };
}

export async function listProjectItems(projectId: string): Promise<ProjectItem[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("project_items")
    .select("id, project_id, asset_id, position, caption, media_assets(name, type, storage_path)")
    .eq("project_id", projectId)
    .order("position");

  if (error || !data) return [];

  return Promise.all(
    data.map(async (item) => {
      const a = item.media_assets as unknown as { name: string; type: string; storage_path: string } | null;
      return {
        id: item.id,
        project_id: item.project_id,
        asset_id: item.asset_id,
        position: item.position,
        caption: item.caption,
        asset_name: a?.name ?? "",
        asset_type: (a?.type ?? "image") as "image" | "video",
        signedUrl: a?.storage_path ? await getSignedUrl(a.storage_path).catch(() => undefined) : undefined,
      };
    })
  );
}

export async function addProjectItems(
  projectId: string,
  assetIds: string[]
): Promise<{ error?: string }> {
  const { supabase } = await getUser();

  const { data: existing } = await supabase
    .from("project_items")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1);

  const start = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("project_items").insert(
    assetIds.map((asset_id, i) => ({ project_id: projectId, asset_id, position: start + i }))
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return {};
}

export async function removeProjectItem(itemId: string): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  const { error } = await supabase.from("project_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}

export async function reorderProjectItems(
  items: { id: string; position: number }[]
): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  await Promise.all(items.map(({ id, position }) =>
    supabase.from("project_items").update({ position }).eq("id", id)
  ));
  return {};
}

export async function updateProjectItemCaption(
  itemId: string,
  caption: string | null
): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  const { error } = await supabase.from("project_items").update({ caption }).eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}
