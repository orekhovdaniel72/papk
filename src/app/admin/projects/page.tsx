import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { listProjects, createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteProjectButton } from "./delete-project-button";
import { DuplicateProjectButton } from "./duplicate-project-button";

export const metadata: Metadata = { title: "Проекты" };

export default async function ProjectsPage() {
  const projects = await listProjects();

  async function handleCreate() {
    "use server";
    const result = await createProject("Новый проект");
    if (result.id) redirect(`/admin/projects/${result.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
          <p className="mt-1 text-sm text-muted-foreground">Тематические подборки работ — основа для резюме.</p>
        </div>
        <form action={handleCreate}>
          <Button size="sm" className="gap-2"><Plus className="size-4" />Новый проект</Button>
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="size-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Проектов пока нет — создай первый</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {p.item_count} медиафайл(ов) · {new Date(p.created_at).toLocaleDateString("ru")}
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 rounded-full">
                    <Link href={`/admin/projects/${p.id}`}>Открыть</Link>
                  </Button>
                  <DuplicateProjectButton id={p.id} />
                  <DeleteProjectButton id={p.id} title={p.title} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
