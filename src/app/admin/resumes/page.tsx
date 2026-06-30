import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";

import { createResume, listResumes } from "@/app/actions/resumes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Резюме" };

export default async function ResumesPage() {
  const resumes = await listResumes();

  async function handleCreate() {
    "use server";
    const result = await createResume("Новое резюме");
    if (result.id) redirect(`/admin/resumes/${result.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Резюме</h1>
          <p className="mt-1 text-sm text-muted-foreground">Собирай подборки под разные вакансии из проектов.</p>
        </div>
        <form action={handleCreate}>
          <Button size="sm" className="gap-2">
            <Plus className="size-4" />
            Новое резюме
          </Button>
        </form>
      </div>

      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="size-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Резюме пока нет — создай первое</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card key={resume.id} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{resume.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {resume.item_count} работ(ы) · {new Date(resume.created_at).toLocaleDateString("ru")}
                </p>
                <Button asChild size="sm" variant="outline" className="w-full rounded-full">
                  <Link href={`/admin/resumes/${resume.id}`}>Открыть</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
