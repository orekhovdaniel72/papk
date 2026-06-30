"use client";

import { useRef, useState, useTransition, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { saveAsset } from "@/app/actions/media";
import { cn } from "@/lib/utils";

type UploadState = { name: string; progress: "uploading" | "done" | "error"; error?: string };

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif", "tif", "tiff"];
const VIDEO_EXTS = ["mp4", "mov", "webm", "avi", "mkv", "m4v", "3gp", "wmv"];

function fileExt(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function isMedia(file: File): boolean {
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) return true;
  const ext = fileExt(file.name);
  return IMAGE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext);
}

function mediaType(file: File): "image" | "video" {
  if (file.type.startsWith("video/")) return "video";
  const ext = fileExt(file.name);
  return VIDEO_EXTS.includes(ext) ? "video" : "image";
}

function getMediaMeta(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);

    if (mediaType(file) === "image") {
      const img = new Image();
      const timer = setTimeout(() => { URL.revokeObjectURL(url); resolve({}); }, 5000);
      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({});
      };
      img.src = url;
    } else {
      const video = document.createElement("video");
      video.preload = "metadata";
      const timer = setTimeout(() => { URL.revokeObjectURL(url); resolve({}); }, 5000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
      };
      video.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({});
      };
      video.src = url;
      video.load();
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
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function uploadFiles(files: FileList | File[]) {
    setGlobalError(null);

    const supabase = createClient();

    // Явная проверка сессии
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      const msg = authError?.message ?? "Сессия не найдена";
      console.error("[upload] auth.getUser failed:", msg);
      setGlobalError(`Ошибка авторизации: ${msg}. Обнови страницу.`);
      return;
    }
    const user = authData.user;
    console.log("[upload] user:", user.id);

    const list = Array.from(files).filter(isMedia);
    if (!list.length) {
      const names = Array.from(files).map((f) => `${f.name} (${f.type || "no-type"})`).join(", ");
      console.error("[upload] unsupported files:", names);
      setGlobalError(`Неподдерживаемый формат. Получили: ${names}`);
      return;
    }

    setUploads(list.map((f) => ({ name: f.name, progress: "uploading" })));

    let allDone = true;
    await Promise.all(
      list.map(async (file, i) => {
        const path = `${user.id}/${Date.now()}-${sanitizePath(file.name)}`;
        console.log("[upload] uploading to path:", path);

        const { error: storageError } = await supabase.storage
          .from("media")
          .upload(path, file);

        if (storageError) {
          console.error("[upload] storage error:", storageError.message);
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === i ? { ...u, progress: "error", error: storageError.message } : u
            )
          );
          allDone = false;
          return;
        }

        console.log("[upload] uploaded, saving metadata...");
        const { width, height, duration } = await getMediaMeta(file);
        const result = await saveAsset({
          name: file.name,
          type: mediaType(file),
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type,
          width,
          height,
          duration_sec: duration,
        });

        if (result?.error) {
          console.error("[upload] saveAsset error:", result.error);
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === i ? { ...u, progress: "error", error: result.error } : u
            )
          );
          allDone = false;
          return;
        }

        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, progress: "done" } : u))
        );
      })
    );

    if (allDone) {
      startTransition(() => router.refresh());
      setTimeout(() => setUploads([]), 1500);
    }
    // При ошибках — список остаётся, чтобы пользователь видел что пошло не так
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files); // snapshot до сброса инпута
    e.target.value = "";
    uploadFiles(files);
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

      {/* Глобальная ошибка (сессия, тип файла) */}
      {globalError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {globalError}
        </div>
      )}

      {/* Прогресс по файлам */}
      {uploads.length > 0 && (
        <ul className="space-y-1.5">
          {uploads.map((u) => (
            <li key={u.name} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-sm">
                {u.progress === "uploading" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : u.progress === "done" ? (
                  <span className="size-3.5 shrink-0 text-green-500">✓</span>
                ) : (
                  <span className="size-3.5 shrink-0 text-destructive">✗</span>
                )}
                <span className="truncate text-muted-foreground">{u.name}</span>
              </div>
              {u.error && (
                <p className="pl-5 text-xs text-destructive">{u.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
