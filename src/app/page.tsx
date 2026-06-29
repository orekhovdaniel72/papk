import Link from "next/link";
import { ArrowRight, Layers, Link2, ShieldCheck } from "lucide-react";

import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Layers,
    title: "Подборки под задачу",
    text: "Разные резюме из одной медиатеки — свой состав и порядок работ под каждую вакансию.",
  },
  {
    icon: ShieldCheck,
    title: "Защищённый показ",
    text: "Фото и видео открываются красиво, но без штатного скачивания и с водяным знаком.",
  },
  {
    icon: Link2,
    title: "Ссылки с доступом",
    text: "Делитесь резюме по ссылке — с паролем и сроком. Соседние подборки остаются скрыты.",
  },
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Декоративный фон */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
        <div
          className="absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(60%_50%_at_50%_30%,black,transparent)]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            color: "var(--muted-foreground)",
          }}
        />
      </div>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center sm:pt-32">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            {site.role} · Портфолио
          </span>
        </div>

        <h1 className="animate-in fade-in slide-in-from-bottom-4 mt-7 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight duration-700 sm:text-6xl md:text-7xl">
          {site.tagline}
        </h1>

        <p className="animate-in fade-in slide-in-from-bottom-5 mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground duration-1000">
          {site.description}
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-6 mt-9 flex flex-col items-center gap-3 duration-1000 sm:flex-row">
          <Button asChild size="lg" className="group rounded-full px-7">
            <Link href="/login">
              Войти в кабинет
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full px-7"
          >
            <a href={`mailto:${site.email}`}>Связаться</a>
          </Button>
        </div>
      </section>

      {/* Ценности */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-28">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-in fade-in slide-in-from-bottom-4 group rounded-2xl border border-border/70 bg-card/50 p-6 text-left backdrop-blur-sm transition-colors hover:bg-card"
              style={{ animationDelay: `${150 + i * 120}ms` }}
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background text-foreground transition-colors group-hover:border-primary/40">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
