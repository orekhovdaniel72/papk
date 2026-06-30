"use client";

import type { PublicResume } from "@/app/actions/public-resume";

// slug пробрасывается сюда, чтобы строить URL /api/media/[id]?slug=...
// и показывать водяной знак с идентификатором ссылки
export function ResumeView({ resume, slug }: { resume: PublicResume; slug: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-10">
      {/* Заголовок */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{resume.title}</h1>
        {resume.about && <p className="text-muted-foreground whitespace-pre-line">{resume.about}</p>}
      </div>

      {/* Контакты */}
      {resume.contacts.length > 0 && (
        <section className="flex flex-wrap gap-3">
          {resume.contacts.map((c, i) => (
            <span key={i} className="text-sm">
              <span className="text-muted-foreground">{c.label}:</span>{" "}
              {c.type === "url" ? (
                <a href={c.value} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {c.value}
                </a>
              ) : c.type === "email" ? (
                <a href={`mailto:${c.value}`} className="underline underline-offset-2">{c.value}</a>
              ) : c.type === "phone" ? (
                <a href={`tel:${c.value}`} className="underline underline-offset-2">{c.value}</a>
              ) : (
                c.value
              )}
            </span>
          ))}
        </section>
      )}

      {/* Работы */}
      {resume.items.length > 0 && (
        <section className="space-y-8">
          {resume.items.map((item) => {
            const mediaSrc = `/api/media/${item.asset_id}?slug=${slug}`;
            return (
              <div key={item.id} className="space-y-2">
                {item.project_title && (
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.project_title}
                  </p>
                )}

                {/* Обёртка с водяным знаком */}
                <div
                  className="relative w-full overflow-hidden rounded-xl bg-muted select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {item.asset_type === "image" ? (
                    // Фото через CSS background — src не светится в DOM
                    <div
                      role="img"
                      aria-label={item.caption ?? item.project_title}
                      className="w-full"
                      style={{
                        backgroundImage: `url(${mediaSrc})`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        // минимальная высота; вырастет под aspect ratio через padding-top
                        paddingTop: "56.25%",
                      }}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  ) : (
                    <video
                      src={mediaSrc}
                      className="w-full rounded-xl bg-muted"
                      controls
                      controlsList="nodownload nofullscreen"
                      disablePictureInPicture
                      playsInline
                      preload="metadata"
                    />
                  )}

                  {/* Водяной знак — slug как трейсируемый идентификатор */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-2 right-3 text-[11px] font-mono text-white/40 select-none"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                  >
                    {slug}
                  </span>
                </div>

                {item.caption && (
                  <p className="text-sm text-muted-foreground">{item.caption}</p>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
