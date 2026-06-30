"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeView } from "./resume-view";
import type { PublicResume } from "@/app/actions/public-resume";

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function PasswordGate({
  slug,
  passwordHash,
  linkId,
  resumeId,
}: {
  slug: string;
  passwordHash: string;
  linkId: string;
  resumeId: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState<PublicResume | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const hash = await sha256hex(password);
    if (hash !== passwordHash) {
      setError("Неверный пароль");
      setLoading(false);
      return;
    }

    // Инкремент + загрузка резюме через API route
    const res = await fetch(`/api/r/${slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId, resumeId }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setError(data.error ?? "Ошибка");
      setLoading(false);
      return;
    }
    setResume(data.resume);
    setLoading(false);
  }

  if (resume) return <ResumeView resume={resume} slug={slug} />;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Lock className="size-8 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Защищено паролем</h1>
          <p className="text-sm text-muted-foreground">Введи пароль для просмотра резюме</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full gap-2" disabled={loading || !password}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Открыть
          </Button>
        </form>
      </div>
    </main>
  );
}
