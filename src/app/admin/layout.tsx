import type { Metadata } from "next";
import Link from "next/link";
import { Images, LogOut } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { default: "Кабинет", template: `%s · Кабинет` },
};

// Навигация растёт с этапами — пока только готовые разделы
const navItems = [
  { href: "/admin", label: "Обзор", icon: Images },
  { href: "/admin/media", label: "Медиатека", icon: Images },
  { href: "/admin/projects", label: "Проекты", icon: Images },
  { href: "/admin/resumes", label: "Резюме", icon: Images },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Шапка кабинета */}
      <header className="sticky top-16 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-6">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>

          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              Выйти
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </div>
    </div>
  );
}
