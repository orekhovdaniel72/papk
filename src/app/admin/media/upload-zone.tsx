"use client";

import { useRef, useState, useTransition, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { saveAsset } from "@/app/actions/media";
import { cn } from "@/lib/utils";

type UploadState = { name: string; progress: "uploading" | "done" | "error" };

function getMediaMeta(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.onloadedmetadata = () =>
        resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
      video.onerror = () => resolve({});
      video.src = URL.createObjectURL(file);
    } else {
      resolve({});
    }
  });
}

function sanitizePath(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [, startTransition] = useTransition();

  async function uploadFiles(files: FileList | File[]) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const list = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (!list.length) return;

    setUploads(list.map((f) => ({ name: f.name, progress: "uploading" })));

    await Promise.all(
      list.map(async (file, i) => {
        const path = `${user.id}/${Date.now()}-${sanitizePath(file.name)}`;
        const { error } = await supabase.storage.from("media").upload(path, file);

        if (error) {
          setUploads((prev) => prev.map((u, idx) => idx === i ? { ...u, progress: "error" } : u));
          return;
        }

        const meta = await getMediaMeta(file);
        await saveAsset({
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "video",
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type,
          ...meta,
        });

        setUploads((prev) => prev.map((u, idx) => idx === i ? { ...u, progress: "done" } : u));
      })
    );

    startTransition(() => router.refresh());
    setTimeout(() => setUploads([]), 2000);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors",
          dragging
            ? "border-primary/60 bg-primary/5"
            : "border-border/70 bg-muted/30 hover:border-border hover:bg-muted/50"
        )}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Перетащи файлы или нажми для выбора</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Фото (JPG, PNG, WEBP) и видео (MP4, MOV, WEBM)
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={onChange}
      />

      {uploads.length > 0 && (
        <ul className="space-y-1.5">
          {uploads.map((u) => (
            <li key={u.name} className="flex items-center gap-2 text-sm">
              {u.progress === "uploading" ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
              ) : u.progress === "done" ? (
                <span className="size-3.5 shrink-0 text-green-500">✓</span>
              ) : (
                <span className="size-3.5 shrink-0 text-destructive">✗</span>
              )}
              <span className="truncate text-muted-foreground">{u.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
