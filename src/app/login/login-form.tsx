"use client";

import { useActionState } from "react";
import { Lock, Loader2 } from "lucide-react";

import { login } from "@/app/actions/auth";
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
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
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
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@yuzotova.art"
              autoComplete="email"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={pending}
            />
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" className="mt-1 w-full rounded-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Входим…
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </form>
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
  );
}
