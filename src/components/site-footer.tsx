import Link from "next/link";

import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>
          © {site.fullName} · {site.role}
        </span>
        <div className="flex items-center gap-4">
          <a
            href={`mailto:${site.email}`}
            className="transition-colors hover:text-foreground"
          >
            {site.email}
          </a>
          {/* Вход в кабинет — только для художника, намеренно скрытая ссылка */}
          <Link
            href="/login"
            className="opacity-30 transition-opacity hover:opacity-70"
            aria-label="Войти в кабинет"
          >
            ·
          </Link>
        </div>
      </div>
    </footer>
  );
}
