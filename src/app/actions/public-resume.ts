"use server";

import { createServiceClient } from "@/lib/supabase/service";

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
  // asset_id используется клиентом для построения URL /api/media/[id]?slug=...
  asset_id: string;
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
      .select("id, position, caption, asset_id, media_assets(type), projects(title)")
      .eq("resume_id", resumeId)
      .order("position"),
  ]);

  if (!resume) return null;

  const resolvedItems: PublicResumeItem[] = (items ?? []).map((item) => {
    const a = item.media_assets as unknown as { type: string } | null;
    const p = item.projects as unknown as { title: string } | null;
    return {
      id: item.id,
      position: item.position,
      caption: item.caption,
      asset_type: (a?.type ?? "image") as "image" | "video",
      project_title: p?.title ?? "",
      asset_id: item.asset_id,
    };
  });

  return {
    title: resume.title,
    about: resume.about,
    contacts: contacts ?? [],
    items: resolvedItems,
  };
}
