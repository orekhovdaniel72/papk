"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      size="icon" variant="ghost"
      className="size-8 text-destructive hover:bg-destructive/10"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Удалить проект «${title}»? Медиафайлы останутся в медиатеке.`)) return;
        start(async () => { await deleteProject(id); router.refresh(); });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
