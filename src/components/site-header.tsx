import Link from "next/link";

import { site } from "@/lib/site";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="group inline-flex items-baseline gap-1 text-lg font-semibold tracking-tight"
        >
          <span>{site.wordmark}</span>
          <span className="text-muted-foreground transition-colors group-hover:text-foreground">
            .art
          </span>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
