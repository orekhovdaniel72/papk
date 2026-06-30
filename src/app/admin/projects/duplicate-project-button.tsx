"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { duplicateProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

export function DuplicateProjectButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button size="icon" variant="ghost" className="size-8" disabled={pending}
      onClick={() => start(async () => { await duplicateProject(id); router.refresh(); })}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
