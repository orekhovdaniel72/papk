import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Вход",
  description: `Кабинет владельца ${site.fullName}`,
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background">
              <Lock className="size-5" />
            </div>
            <CardTitle className="mt-2 text-xl tracking-tight">
              Кабинет владельца
            </CardTitle>
            <CardDescription>
              Вход для управления портфолио и резюме
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* UI-заглушка: авторизация подключается на Этапе 1 (Supabase) */}
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@yuzotova.art"
                  autoComplete="email"
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled
                />
              </div>
              <Button type="button" className="mt-1 w-full rounded-full" disabled>
                Войти
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Авторизация подключается на следующем шаге (Supabase).
            </p>
          </CardContent>

          <CardFooter className="justify-center">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/">
                <ArrowLeft className="size-4" />
                На главную
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
