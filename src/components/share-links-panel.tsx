"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link2, Loader2, Plus, Trash2, X } from "lucide-react";

import {
  createShareLink,
  deleteShareLink,
  listShareLinks,
  revokeShareLink,
  type ShareLink,
} from "@/app/actions/share-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function linkUrl(slug: string) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/r/${slug}`;
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return null;
  return new Date(expiresAt).toLocaleDateString("ru");
}

export function ShareLinksPanel({
  resumeId,
  initialLinks,
}: {
  resumeId: string;
  initialLinks: ShareLink[];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [isCreating, setIsCreating] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [viewLimit, setViewLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setStatus(null);
    const result = await createShareLink(resumeId, {
      password: password || undefined,
      expiresAt: expiresAt || undefined,
      viewLimit: viewLimit ? parseInt(viewLimit, 10) : undefined,
    });
    setLoading(false);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    const fresh = await listShareLinks(resumeId);
    setLinks(fresh);
    setIsCreating(false);
    setPassword("");
    setExpiresAt("");
    setViewLimit("");
    setStatus("Ссылка создана");
  }

  async function handleRevoke(linkId: string) {
    const result = await revokeShareLink(linkId, resumeId);
    if (result.error) { setStatus(result.error); return; }
    setLinks((prev) => prev.map((l) => l.id === linkId ? { ...l, revoked: true } : l));
  }

  async function handleDelete(linkId: string) {
    const result = await deleteShareLink(linkId, resumeId);
    if (result.error) { setStatus(result.error); return; }
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(linkUrl(slug));
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Ссылки для шаринга</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Поделись резюме через изолированную ссылку.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setIsCreating((v) => !v)}>
          {isCreating ? <X className="size-4" /> : <Plus className="size-4" />}
          {isCreating ? "Отмена" : "Новая ссылка"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

        {isCreating && (
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">Параметры ссылки</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Пароль (опц.)</label>
                <Input
                  type="password"
                  placeholder="Без пароля"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Истекает (опц.)</label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Лимит просмотров (опц.)</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Без лимита"
                  value={viewLimit}
                  onChange={(e) => setViewLimit(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Создать ссылку
            </Button>
          </div>
        )}

        {links.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Нет ссылок — создай первую
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${link.revoked ? "opacity-50" : ""}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate font-mono text-sm">/r/{link.slug}</p>
                  <p className="text-xs text-muted-foreground">
                    {link.view_count} просм.
                    {link.view_limit ? ` / ${link.view_limit}` : ""}
                    {link.expires_at ? ` · до ${formatExpiry(link.expires_at)}` : ""}
                    {link.password_hash ? " · 🔒" : ""}
                    {link.revoked ? " · отозвана" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyLink(link.slug)}
                    title="Скопировать ссылку"
                  >
                    {copiedSlug === link.slug ? (
                      <span className="text-xs text-green-500">✓</span>
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon-sm" asChild title="Открыть">
                    <a href={linkUrl(link.slug)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                  {!link.revoked && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRevoke(link.id)}
                      title="Отозвать"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(link.id)}
                    title="Удалить"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
