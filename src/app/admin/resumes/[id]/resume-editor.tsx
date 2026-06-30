"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical, Loader2, Plus, Save, Trash2 } from "lucide-react";

import {
  addResumeItems,
  listResumeItems,
  removeResumeItem,
  reorderResumeItems,
  saveResumeContacts,
  updateResume,
  updateResumeItemCaption,
  type Resume,
  type ResumeContact,
  type ResumeItem,
} from "@/app/actions/resumes";
import { listProjects, listProjectItems as listProjectMedia, type Project, type ProjectItem } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SortableGrid } from "@/components/sortable-grid";

export function ResumeEditor({
  resume,
  initialContacts,
  initialItems,
}: {
  resume: Resume;
  initialContacts: ResumeContact[];
  initialItems: ResumeItem[];
}) {
  const [title, setTitle] = useState(resume.title);
  const [about, setAbout] = useState(resume.about ?? "");
  const [contacts, setContacts] = useState(initialContacts);
  const [items, setItems] = useState(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setStatus(null);
    const result = await updateResume(resume.id, { title, about });
    setIsSaving(false);
    setStatus(result.error ?? "Сохранено");
  }

  async function handleSaveContacts() {
    const result = await saveResumeContacts(
      resume.id,
      contacts.map((contact) => ({ label: contact.label, value: contact.value, type: contact.type }))
    );
    setStatus(result.error ?? "Контакты сохранены");
  }

  async function openPicker() {
    setIsPickerOpen(true);
    setPickerLoading(true);
    const nextProjects = await listProjects();
    setProjects(nextProjects);
    if (nextProjects[0]) {
      const nextItems = await listProjectMedia(nextProjects[0].id);
      setSelectedProjectId(nextProjects[0].id);
      setProjectItems(nextItems);
    } else {
      setSelectedProjectId(null);
      setProjectItems([]);
    }
    setPickerLoading(false);
  }

  async function selectProject(projectId: string) {
    setPickerLoading(true);
    const nextItems = await listProjectMedia(projectId);
    setSelectedProjectId(projectId);
    setProjectItems(nextItems);
    setPickerLoading(false);
  }

  function toggleAsset(assetId: string) {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((item) => item !== assetId) : [...prev, assetId]
    );
  }

  async function handleAddFromProject() {
    if (!selectedProjectId || !selectedAssetIds.length) return;

    const newIds = selectedAssetIds.filter((id) => !items.some((i) => i.asset_id === id));
    if (newIds.length === 0) return;

    const result = await addResumeItems(
      resume.id,
      newIds.map((assetId) => ({ projectId: selectedProjectId, assetId }))
    );
    if (result.error) {
      setStatus(result.error);
      return;
    }

    const nextItems = await listResumeItems(resume.id);
    setItems(nextItems);
    setStatus(`Добавлено ${newIds.length} работ(ы)`);
    setSelectedAssetIds([]);
    setIsPickerOpen(false);
  }

  async function handleRemove(itemId: string) {
    const result = await removeResumeItem(itemId);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setStatus("Удалено");
  }

  async function handleReorder(nextItems: ResumeItem[]) {
    setItems(nextItems);
    const result = await reorderResumeItems(nextItems.map((item, index) => ({ id: item.id, position: index })));
    if (result.error) {
      setStatus(result.error);
    }
  }

  async function handleCaptionChange(itemId: string, value: string) {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, caption: value || null } : item)));
    const result = await updateResumeItemCaption(itemId, value || null);
    if (result.error) {
      setStatus(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/resumes" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            К списку резюме
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Редактор резюме</h1>
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
            <label className="text-sm font-medium">Обо мне</label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Контакты</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.map((contact, index) => (
            <div key={contact.id || `${contact.label}-${index}`} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1.2fr_1.6fr_0.8fr_auto]">
              <Input
                placeholder="Label"
                value={contact.label}
                onChange={(e) => setContacts((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, label: e.target.value } : entry))}
              />
              <Input
                placeholder="Value"
                value={contact.value}
                onChange={(e) => setContacts((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, value: e.target.value } : entry))}
              />
              <select
                value={contact.type}
                onChange={(e) => setContacts((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, type: e.target.value as ResumeContact["type"] } : entry))}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="text">Текст</option>
                <option value="url">Ссылка</option>
                <option value="phone">Телефон</option>
                <option value="email">Email</option>
              </select>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setContacts((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setContacts((prev) => [...prev, { id: `tmp-${prev.length}`, resume_id: resume.id, label: "", value: "", type: "text", position: prev.length }])}>
              <Plus className="size-4" />
              Добавить строку
            </Button>
            <Button onClick={handleSaveContacts}>Сохранить контакты</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Работы</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Выбирай работы из проектов и сортируй их.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={openPicker}>
            <Plus className="size-4" />
            Добавить из проекта
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              В резюме пока нет работ — добавь их из проектов.
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
                      <span>{item.project_title || item.asset_name}</span>
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
                      <video src={item.signedUrl} className="mb-3 aspect-video w-full rounded-lg object-cover" controls muted preload="metadata" />
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

      <Dialog open={isPickerOpen} onOpenChange={(value) => !value && setIsPickerOpen(false)}>
        <DialogContent className="sm:max-w-5xl lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Добавить работы из проектов</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => selectProject(project.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${selectedProjectId === project.id ? "border-primary bg-primary/10" : "border-border/70"}`}
                >
                  {project.title}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {pickerLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : projectItems.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">В проекте нет медиа</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {projectItems.map((item) => {
                    const isSelected = selectedAssetIds.includes(item.asset_id);
                    const alreadyAdded = items.some((i) => i.asset_id === item.asset_id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={alreadyAdded ? undefined : () => toggleAsset(item.asset_id)}
                        className={`rounded-xl border p-1.5 text-left transition-transform ${
                          alreadyAdded
                            ? "opacity-40 cursor-not-allowed border-border/70"
                            : isSelected
                            ? "border-primary"
                            : "border-border/70 hover:scale-[1.02]"
                        }`}
                      >
                        {item.signedUrl ? (
                          item.asset_type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.signedUrl} alt={item.asset_name} className="mb-1.5 aspect-video w-full rounded-lg object-cover" draggable={false} />
                          ) : (
                            <video src={item.signedUrl} className="mb-1.5 aspect-video w-full rounded-lg object-cover" controls muted preload="metadata" />
                          )
                        ) : null}
                        <p className="truncate text-xs text-muted-foreground">{item.asset_name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleAddFromProject} disabled={!selectedAssetIds.length}>
                  Добавить {selectedAssetIds.length > 0 ? `${selectedAssetIds.length}` : ""}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
