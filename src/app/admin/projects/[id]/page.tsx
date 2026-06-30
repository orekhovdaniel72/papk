import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProject, listProjectItems } from "@/app/actions/projects";
import { ProjectEditor } from "./project-editor";

export const metadata: Metadata = { title: "Редактор проекта" };

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const initialItems = await listProjectItems(id);

  return <ProjectEditor project={project} initialItems={initialItems} />;
}
