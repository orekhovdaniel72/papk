"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Film, Loader2, Eye } from "lucide-react";

import { deleteAsset, type MediaAsset } from "@/app/actions/media";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function AssetCard({ asset }: { asset: MediaAsset }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hovered, setHovered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!confirm(`Удалить «${asset.name}»?`)) return;
    startTransition(async () => {
      await deleteAsset(asset.id);
      router.refresh();
    });
  }

  function openPreview() {
    if (!pending) {
      setPreviewOpen(true);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-xl border border-border/70 bg-muted/30 transition-colors",
          pending && "pointer-events-none opacity-50"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={openPreview}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPreview();
          }
        }}
      >
        {/* Превью */}
        <div className="aspect-square w-full overflow-hidden">
          {asset.type === "image" && asset.signedUrl ? (
            /* Фото — через img (не next/image), чтобы не кэшировать подписанный URL */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.signedUrl}
              alt={asset.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : asset.type === "video" && asset.signedUrl ? (
            <video
              src={asset.signedUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
              /* Автовоспроизведение при наведении для превью */
              autoPlay={hovered}
              loop
              controlsList="nodownload nofullscreen"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Film className="size-10 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Оверлей с кнопкой удаления */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{asset.name}</p>
            <p className="text-[10px] text-white/60">{formatBytes(asset.size_bytes)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-white/70 hover:bg-primary/80 hover:text-white"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewOpen(true);
              }}
              aria-label="Открыть"
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-white/70 hover:bg-red-500/80 hover:text-white"
              onClick={handleDelete}
              disabled={pending}
              aria-label="Удалить"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Бейдж типа */}
        {asset.type === "video" && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
            <Film className="size-2.5" />
            видео
          </div>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{asset.name}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto rounded-xl bg-muted/30 p-2">
            {asset.type === "image" && asset.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.signedUrl}
                alt={asset.name}
                className="mx-auto max-h-[70vh] w-full rounded-lg object-contain"
                draggable={false}
              />
            ) : asset.type === "video" && asset.signedUrl ? (
              <video
                src={asset.signedUrl}
                className="mx-auto max-h-[70vh] w-full rounded-lg bg-black"
                controls
                controlsList="nodownload"
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">Файл недоступен для просмотра</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MediaGrid({ assets }: { assets: MediaAsset[] }) {
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Film className="size-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">
          Медиатека пока пустая — загрузи первые файлы выше
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
