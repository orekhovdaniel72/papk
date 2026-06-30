"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical, Loader2, Plus, Save, Trash2 } from "lucide-react";

import {
  addProjectItems,
  listProjectItems,
  removeProjectItem,
  reorderProjectItems,
  updateProject,
  updateProjectItemCaption,
  type Project,
  type ProjectItem,
} from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaPickerModal } from "@/components/media-picker-modal";
import { SortableGrid } from "@/components/sortable-grid";

export function ProjectEditor({ project, initialItems }: { project: Project; initialItems: ProjectItem[] }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [items, setItems] = useState(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setStatus(null);
    const result = await updateProject(project.id, { title, description });
    setIsSaving(false);
    setStatus(result.error ?? "Сохранено");
  }

  async function handleAddItems(ids: string[]) {
    if (!ids.length) return;
    const result = await addProjectItems(project.id, ids);
    if (result.error) {
      setStatus(result.error);
      return;
    }

    const nextItems = await listProjectItems(project.id);
    setItems(nextItems);
    setStatus(`Добавлено ${ids.length} файл(ов)`);
  }

  async function handleRemove(itemId: string) {
    const result = await removeProjectItem(itemId);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setStatus("Удалено");
  }

  async function handleReorder(nextItems: ProjectItem[]) {
    setItems(nextItems);
    const result = await reorderProjectItems(
      nextItems.map((item, index) => ({ id: item.id, position: index }))
    );
    if (result.error) {
      setStatus(result.error);
    }
  }

  async function handleCaptionChange(itemId: string, value: string) {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, caption: value || null } : item)));
    const result = await updateProjectItemCaption(itemId, value || null);
    if (result.error) {
      setStatus(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/projects" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            К списку проектов
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Редактор проекта</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Сохранить
        </Button>
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Основное</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Название</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Описание проекта</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Медиа проекта</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Сортируй и дополняй подборку.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="size-4" />
            Добавить из медиатеки
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              В проекте пока нет медиа — добавь из медиатеки.
            </div>
          ) : (
            <SortableGrid
              items={items}
              onChange={handleReorder}
              className="grid gap-3 md:grid-cols-2"
              renderItem={(item, dragProps) => (
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <button type="button" {...dragProps} className="cursor-grab rounded p-1 hover:bg-muted">
                        <GripVertical className="size-4" />
                      </button>
                      <span>{item.asset_name}</span>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(item.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="p-3">
                    {item.asset_type === "image" && item.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.signedUrl} alt={item.asset_name} className="mb-3 aspect-video w-full rounded-lg object-cover" draggable={false} />
                    ) : item.asset_type === "video" && item.signedUrl ? (
                      <video src={item.signedUrl} className="mb-3 aspect-video w-full rounded-lg object-cover" muted preload="metadata" />
                    ) : null}
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Подпись</label>
                    <Textarea
                      rows={2}
                      value={item.caption ?? ""}
                      onChange={(e) => setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, caption: e.target.value } : entry)))}
                      onBlur={(e) => handleCaptionChange(item.id, e.target.value)}
                      className="mt-2"
                      placeholder="Добавить подпись"
                    />
                  </div>
                </Card>
              )}
            />
          )}
        </CardContent>
      </Card>

      <MediaPickerModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        excludedIds={items.map((item) => item.asset_id)}
        onConfirm={handleAddItems}
      />
    </div>
  );
}
