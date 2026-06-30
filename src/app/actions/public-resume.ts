"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getSignedUrl } from "@/lib/storage";

export type PublicResumeContact = {
  label: string;
  value: string;
  type: string;
};

export type PublicResumeItem = {
  id: string;
  position: number;
  caption: string | null;
  asset_type: "image" | "video";
  project_title: string;
  signedUrl: string;
};

export type PublicResume = {
  title: string;
  about: string | null;
  contacts: PublicResumeContact[];
  items: PublicResumeItem[];
};

export async function getPublicResume(resumeId: string): Promise<PublicResume | null> {
  const db = createServiceClient();

  const [{ data: resume }, { data: contacts }, { data: items }] = await Promise.all([
    db.from("resumes").select("title, about").eq("id", resumeId).single(),
    db.from("resume_contacts").select("label, value, type").eq("resume_id", resumeId).order("position"),
    db.from("resume_items")
      .select("id, position, caption, asset_id, media_assets(type, storage_path), projects(title)")
      .eq("resume_id", resumeId)
      .order("position"),
  ]);

  if (!resume) return null;

  const resolvedItems: PublicResumeItem[] = await Promise.all(
    (items ?? []).map(async (item) => {
      const a = item.media_assets as unknown as { type: string; storage_path: string } | null;
      const p = item.projects as unknown as { title: string } | null;
      const signedUrl = a?.storage_path ? await getSignedUrl(a.storage_path).catch(() => "") : "";
      return {
        id: item.id,
        position: item.position,
        caption: item.caption,
        asset_type: (a?.type ?? "image") as "image" | "video",
        project_title: p?.title ?? "",
        signedUrl,
      };
    })
  );

  return {
    title: resume.title,
    about: resume.about,
    contacts: contacts ?? [],
    items: resolvedItems,
  };
}
