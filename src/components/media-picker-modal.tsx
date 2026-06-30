"use client";

import { useState, useEffect } from "react";
import { Film, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listAssets, type MediaAsset } from "@/app/actions/media";
import { cn } from "@/lib/utils";

type MediaPickerModalProps = {
  open: boolean;
  onClose: () => void;
  excludedIds: string[];
  onConfirm: (ids: string[]) => Promise<void>;
};

export function MediaPickerModal({ open, onClose, excludedIds, onConfirm }: MediaPickerModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setSelected(new Set());
      void listAssets().then((data) => {
        setAssets(data);
        setLoading(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  function toggle(id: string) {
    if (excludedIds.includes(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    setConfirming(true);
    await onConfirm(Array.from(selected));
    setConfirming(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Выбрать из медиатеки</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Медиатека пустая</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {assets.map((asset) => {
                const excluded = excludedIds.includes(asset.id);
                const isSelected = selected.has(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={excluded}
                    onClick={() => toggle(asset.id)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      excluded ? "cursor-not-allowed opacity-40 border-transparent"
                        : isSelected ? "border-primary"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    {asset.signedUrl && asset.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.signedUrl} alt={asset.name} className="h-full w-full object-cover" draggable={false} />
                    ) : asset.signedUrl ? (
                      <video src={asset.signedUrl} className="h-full w-full object-cover" muted preload="metadata" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Film className="size-6 text-muted-foreground/40" />
                      </div>
                    )}
                    {(isSelected || excluded) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={confirming}>Отмена</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0 || confirming}>
            {confirming && <Loader2 className="mr-2 size-4 animate-spin" />}
            Добавить {selected.size > 0 ? `${selected.size} файл(ов)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
