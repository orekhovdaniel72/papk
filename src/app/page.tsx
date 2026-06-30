import { ArrowRight } from "lucide-react";

import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Декоративный фон */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl dark:bg-primary/12" />
        <div
          className="absolute inset-0 opacity-[0.14] [mask-image:radial-gradient(55%_45%_at_50%_25%,black,transparent)]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            color: "var(--muted-foreground)",
          }}
        />
      </div>

      {/* Основной контент */}
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center px-6 pb-24 pt-20 sm:pt-28">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            {site.role}
          </span>
        </div>

        <h1 className="animate-in fade-in slide-in-from-bottom-4 mt-5 text-6xl font-semibold leading-none tracking-tight duration-700 sm:text-8xl md:text-9xl">
          {site.name}
        </h1>

        <p className="animate-in fade-in slide-in-from-bottom-5 mt-8 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground duration-1000">
          {/*
            Художница меняет этот текст под себя.
            Здесь — краткое профессиональное представление.
          */}
          Создаю 3D-персонажей, окружения и визуализации для игр, кино и
          брендинга. Открыта к проектам и коллаборациям.
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-6 mt-10 flex flex-col gap-3 duration-1000 sm:flex-row">
          <Button asChild size="lg" className="group rounded-full px-8">
            <a href={`mailto:${site.email}`}>
              Написать мне
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
