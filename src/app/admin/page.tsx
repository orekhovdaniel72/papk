import type { Metadata } from "next";
import { Images, FileText, FolderOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Обзор" };

const sections = [
  {
    href: "/admin/media",
    icon: Images,
    title: "Медиатека",
    description: "Загружай фото и видео — основа всех подборок.",
    cta: "Перейти в медиатеку",
  },
  {
    href: "/admin/projects",
    icon: FolderOpen,
    title: "Проекты",
    description: "Собирай тематические подборки работ для будущих резюме.",
    cta: "Открыть проекты",
  },
  {
    href: "/admin/resumes",
    icon: FileText,
    title: "Резюме",
    description: "Собирай подборки из проектов под каждую вакансию.",
    cta: "Мои резюме",
  },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Привет 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {user?.email} · {site.fullName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Card
            key={s.href}
            className="group border-border/70 transition-colors hover:border-border"
          >
            <CardHeader className="pb-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border/70 bg-background">
                <s.icon className="size-5" />
              </div>
              <CardTitle className="mt-3 text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full rounded-full"
              >
                <Link href={s.href}>
                  {s.cta}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Проекты и резюме теперь доступны в админке и готовы к наполнению.
      </p>
    </div>
  );
}
