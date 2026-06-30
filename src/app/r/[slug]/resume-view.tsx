"use client";

import Image from "next/image";
import type { PublicResume } from "@/app/actions/public-resume";

export function ResumeView({ resume }: { resume: PublicResume }) {
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
          {resume.items.map((item) => (
            <div key={item.id} className="space-y-2">
              {item.project_title && (
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {item.project_title}
                </p>
              )}
              {item.asset_type === "image" ? (
                <div
                  className="relative w-full overflow-hidden rounded-xl bg-muted select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <Image
                    src={item.signedUrl}
                    alt={item.caption ?? item.project_title}
                    width={1200}
                    height={800}
                    className="w-full h-auto pointer-events-none"
                    draggable={false}
                    unoptimized
                  />
                </div>
              ) : (
                <video
                  src={item.signedUrl}
                  className="w-full rounded-xl bg-muted"
                  controls
                  controlsList="nodownload nofullscreen"
                  disablePictureInPicture
                  playsInline
                />
              )}
              {item.caption && (
                <p className="text-sm text-muted-foreground">{item.caption}</p>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
