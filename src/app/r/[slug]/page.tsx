import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveShareLink, incrementViewCount } from "@/app/actions/share-links";
import { getPublicResume } from "@/app/actions/public-resume";
import { PasswordGate } from "./password-gate";
import { ResumeView } from "./resume-view";

export const metadata: Metadata = { title: "Резюме" };

// Не кэшировать — счётчик просмотров и лимиты должны быть свежими
export const dynamic = "force-dynamic";

export default async function PublicResumePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { link, error } = await resolveShareLink(slug);

  if (error || !link) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Ссылка недействительна</h1>
          <p className="text-muted-foreground">{error ?? "Страница не найдена"}</p>
        </div>
      </main>
    );
  }

  // Если есть пароль — отдаём форму (клиентский компонент)
  if (link.password_hash) {
    return <PasswordGate slug={slug} passwordHash={link.password_hash} linkId={link.id} resumeId={link.resume_id} />;
  }

  // Инкрементируем счётчик и рендерим резюме
  await incrementViewCount(link.id);
  const resume = await getPublicResume(link.resume_id);
  if (!resume) notFound();

  return <ResumeView resume={resume} />;
}
