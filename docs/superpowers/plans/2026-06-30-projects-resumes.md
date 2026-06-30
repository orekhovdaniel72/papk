# Проекты и Конструктор резюме — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить слой Projects (тематические подборки медиа) и конструктор Resume (редактор с выбором работ из проектов, гибкие контакты).

**Architecture:** MediaAsset → Project (grouping + description) → Resume (curated selection). Все admin-страницы: server component загружает данные, передаёт в client component. DnD через @dnd-kit/sortable. Модалы через shadcn Dialog.

**Tech Stack:** Next.js 16 App Router, Supabase server actions + RLS, @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities, shadcn Dialog + Sheet + Badge + Select + Textarea

## Global Constraints

- Next.js 16 App Router — `"use server"` / `"use client"`, no pages/ dir
- DB только через `createClient()` из `@/lib/supabase/server`
- Медиа — только через `getSignedUrl(storagePath)` из `@/lib/storage`
- Новые shadcn-компоненты: `npx shadcn@latest add <name> --yes` → `src/components/ui/`
- `cn()` из `@/lib/utils`, иконки только из `lucide-react`
- RLS дочерних таблиц (project_items, resume_contacts, resume_items) — через join к родительской
- Тест-фреймворка нет — проверка через `npm run dev` в браузере
- Один коммит на задачу

---

## File Map

**Новые файлы:**
- `src/app/actions/projects.ts`
- `src/app/actions/resumes.ts`
- `src/components/sortable-grid.tsx`
- `src/components/media-picker-modal.tsx`
- `src/components/project-picker-modal.tsx`
- `src/app/admin/projects/page.tsx`
- `src/app/admin/projects/delete-project-button.tsx`
- `src/app/admin/projects/duplicate-project-button.tsx`
- `src/app/admin/projects/[id]/page.tsx`
- `src/app/admin/projects/[id]/project-editor.tsx`
- `src/app/admin/resumes/page.tsx`
- `src/app/admin/resumes/delete-resume-button.tsx`
- `src/app/admin/resumes/duplicate-resume-button.tsx`
- `src/app/admin/resumes/[id]/page.tsx`
- `src/app/admin/resumes/[id]/resume-editor.tsx`

**Изменяемые файлы:**
- `src/app/actions/media.ts` — добавить projectCount/resumeCount
- `src/app/admin/media/media-grid.tsx` — бейджи + Sheet
- `src/app/admin/layout.tsx` — добавить Проекты + Резюме в nav
- `src/app/admin/page.tsx` — убрать плейсхолдер, добавить Проекты
- `docs/roadmap.md` — отметить Этап 3 выполненным

---

### Task 1: DB Migration

**Files:** DB migration via Supabase MCP `apply_migration`

- [ ] **Step 1: Apply migration** с именем `stage3_projects_resumes`:

```sql
-- projects
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);
alter table public.projects enable row level security;
create index on public.projects(owner_id);
create policy "owner select" on public.projects for select using ((select auth.uid()) = owner_id);
create policy "owner insert" on public.projects for insert with check ((select auth.uid()) = owner_id);
create policy "owner update" on public.projects for update using ((select auth.uid()) = owner_id);
create policy "owner delete" on public.projects for delete using ((select auth.uid()) = owner_id);

-- project_items
create table public.project_items (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  asset_id   uuid not null references public.media_assets(id) on delete cascade,
  position   int  not null default 0,
  caption    text,
  unique(project_id, asset_id)
);
alter table public.project_items enable row level security;
create index on public.project_items(project_id);
create index on public.project_items(asset_id);
create policy "owner select" on public.project_items for select using (
  exists (select 1 from public.projects p where p.id = project_items.project_id and (select auth.uid()) = p.owner_id)
);
create policy "owner insert" on public.project_items for insert with check (
  exists (select 1 from public.projects p where p.id = project_items.project_id and (select auth.uid()) = p.owner_id)
);
create policy "owner update" on public.project_items for update using (
  exists (select 1 from public.projects p where p.id = project_items.project_id and (select auth.uid()) = p.owner_id)
);
create policy "owner delete" on public.project_items for delete using (
  exists (select 1 from public.projects p where p.id = project_items.project_id and (select auth.uid()) = p.owner_id)
);

-- resumes
create table public.resumes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  about      text,
  created_at timestamptz not null default now()
);
alter table public.resumes enable row level security;
create index on public.resumes(owner_id);
create policy "owner select" on public.resumes for select using ((select auth.uid()) = owner_id);
create policy "owner insert" on public.resumes for insert with check ((select auth.uid()) = owner_id);
create policy "owner update" on public.resumes for update using ((select auth.uid()) = owner_id);
create policy "owner delete" on public.resumes for delete using ((select auth.uid()) = owner_id);

-- resume_contacts
create table public.resume_contacts (
  id        uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  label     text not null,
  value     text not null,
  type      text not null default 'text',
  position  int  not null default 0
);
alter table public.resume_contacts enable row level security;
create index on public.resume_contacts(resume_id);
create policy "owner select" on public.resume_contacts for select using (
  exists (select 1 from public.resumes r where r.id = resume_contacts.resume_id and (select auth.uid()) = r.owner_id)
);
create policy "owner insert" on public.resume_contacts for insert with check (
  exists (select 1 from public.resumes r where r.id = resume_contacts.resume_id and (select auth.uid()) = r.owner_id)
);
create policy "owner update" on public.resume_contacts for update using (
  exists (select 1 from public.resumes r where r.id = resume_contacts.resume_id and (select auth.uid()) = r.owner_id)
);
create policy "owner delete" on public.resume_contacts for delete using (
  exists (select 1 from public.resumes r where r.id = resume_contacts.resume_id and (select auth.uid()) = r.owner_id)
);

-- resume_items (project_id денормализован — нужен просмотрщику без join)
create table public.resume_items (
  id         uuid primary key default gen_random_uuid(),
  resume_id  uuid not null references public.resumes(id) on delete cascade,
  project_id uuid not null references public.projects(id),
  asset_id   uuid not null references public.media_assets(id),
  position   int  not null default 0,
  caption    text,
  unique(resume_id, asset_id)
);
alter table public.resume_items enable row level security;
create index on public.resume_items(resume_id);
create index on public.resume_items(project_id);
create index on public.resume_items(asset_id);
create policy "owner select" on public.resume_items for select using (
  exists (select 1 from public.resumes r where r.id = resume_items.resume_id and (select auth.uid()) = r.owner_id)
);
create policy "owner insert" on public.resume_items for insert with check (
  exists (select 1 from public.resumes r where r.id = resume_items.resume_id and (select auth.uid()) = r.owner_id)
);
create policy "owner update" on public.resume_items for update using (
  exists (select 1 from public.resumes r where r.id = resume_items.resume_id and (select auth.uid()) = r.owner_id)
);
create policy "owner delete" on public.resume_items for delete using (
  exists (select 1 from public.resumes r where r.id = resume_items.resume_id and (select auth.uid()) = r.owner_id)
);
```

- [ ] **Step 2: Verify** — выполнить в Supabase SQL editor:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
and table_name in ('projects','project_items','resumes','resume_contacts','resume_items');
```
Ожидается: 5 строк.

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "db: добавить таблицы projects, resumes и дочерние (Этап 3)"
```

---

### Task 2: Dependencies

**Files:** package.json, src/components/ui/{dialog,sheet,badge,select,textarea}.tsx

- [ ] **Step 1: Установить dnd-kit**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Добавить shadcn-компоненты**
```bash
npx shadcn@latest add dialog --yes
npx shadcn@latest add sheet --yes
npx shadcn@latest add badge --yes
npx shadcn@latest add select --yes
npx shadcn@latest add textarea --yes
```

- [ ] **Step 3: Verify** — `npm run dev` стартует без ошибок.

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json src/components/ui/
git commit -m "deps: @dnd-kit + shadcn dialog/sheet/badge/select/textarea"
```

---

### Task 3: Server actions — Projects

**Files:** Create `src/app/actions/projects.ts`

**Interfaces produced:**
```typescript
type Project = { id: string; title: string; description: string | null; created_at: string; item_count: number }
type ProjectItem = { id: string; project_id: string; asset_id: string; position: number; caption: string | null; signedUrl?: string; asset_name: string; asset_type: "image" | "video" }

listProjects(): Promise<Project[]>
createProject(title: string): Promise<{ id?: string; error?: string }>
updateProject(id: string, data: { title?: string; description?: string }): Promise<{ error?: string }>
deleteProject(id: string): Promise<{ error?: string }>
duplicateProject(id: string): Promise<{ id?: string; error?: string }>
listProjectItems(projectId: string): Promise<ProjectItem[]>
addProjectItems(projectId: string, assetIds: string[]): Promise<{ error?: string }>
removeProjectItem(itemId: string): Promise<{ error?: string }>
reorderProjectItems(items: { id: string; position: number }[]): Promise<{ error?: string }>
updateProjectItemCaption(itemId: string, caption: string | null): Promise<{ error?: string }>
```

- [ ] **Step 1: Создать `src/app/actions/projects.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  item_count: number;
};

export type ProjectItem = {
  id: string;
  project_id: string;
  asset_id: string;
  position: number;
  caption: string | null;
  signedUrl?: string;
  asset_name: string;
  asset_type: "image" | "video";
};

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function listProjects(): Promise<Project[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, created_at, project_items(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    created_at: p.created_at,
    item_count: (p.project_items as unknown as [{ count: number }])[0]?.count ?? 0,
  }));
}

export async function createProject(title: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Ошибка создания" };
  revalidatePath("/admin/projects");
  return { id: data.id };
}

export async function updateProject(
  id: string,
  patch: { title?: string; description?: string }
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}`);
  return {};
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/projects");
  return {};
}

export async function duplicateProject(id: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: orig } = await supabase
    .from("projects")
    .select("title, description")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!orig) return { error: "Не найдено" };

  const { data: copy, error: err } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, title: `${orig.title} (копия)`, description: orig.description })
    .select("id")
    .single();
  if (err || !copy) return { error: err?.message };

  const { data: items } = await supabase
    .from("project_items")
    .select("asset_id, position, caption")
    .eq("project_id", id);

  if (items?.length) {
    await supabase.from("project_items").insert(
      items.map((i) => ({ project_id: copy.id, ...i }))
    );
  }

  revalidatePath("/admin/projects");
  return { id: copy.id };
}

export async function listProjectItems(projectId: string): Promise<ProjectItem[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("project_items")
    .select("id, project_id, asset_id, position, caption, media_assets(name, type, storage_path)")
    .eq("project_id", projectId)
    .order("position");

  if (error || !data) return [];

  return Promise.all(
    data.map(async (item) => {
      const a = item.media_assets as unknown as { name: string; type: string; storage_path: string } | null;
      return {
        id: item.id,
        project_id: item.project_id,
        asset_id: item.asset_id,
        position: item.position,
        caption: item.caption,
        asset_name: a?.name ?? "",
        asset_type: (a?.type ?? "image") as "image" | "video",
        signedUrl: a?.storage_path ? await getSignedUrl(a.storage_path).catch(() => undefined) : undefined,
      };
    })
  );
}

export async function addProjectItems(
  projectId: string,
  assetIds: string[]
): Promise<{ error?: string }> {
  const { supabase } = await getUser();

  const { data: existing } = await supabase
    .from("project_items")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1);

  const start = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("project_items").insert(
    assetIds.map((asset_id, i) => ({ project_id: projectId, asset_id, position: start + i }))
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return {};
}

export async function removeProjectItem(itemId: string): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  const { error } = await supabase.from("project_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}

export async function reorderProjectItems(
  items: { id: string; position: number }[]
): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  await Promise.all(items.map(({ id, position }) =>
    supabase.from("project_items").update({ position }).eq("id", id)
  ));
  return {};
}

export async function updateProjectItemCaption(
  itemId: string,
  caption: string | null
): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  const { error } = await supabase.from("project_items").update({ caption }).eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` без ошибок.

- [ ] **Step 3: Commit**
```bash
git add src/app/actions/projects.ts
git commit -m "feat: server actions для projects (CRUD + items)"
```

---

### Task 4: Server actions — Resumes

**Files:** Create `src/app/actions/resumes.ts`

**Interfaces produced:**
```typescript
type Resume = { id: string; title: string; about: string | null; created_at: string; item_count: number }
type ResumeContact = { id: string; resume_id: string; label: string; value: string; type: "text"|"url"|"phone"|"email"; position: number }
type ResumeItem = { id: string; resume_id: string; project_id: string; asset_id: string; position: number; caption: string | null; signedUrl?: string; asset_name: string; asset_type: "image"|"video"; project_title: string }

listResumes(): Promise<Resume[]>
getResume(id: string): Promise<Resume | null>
createResume(title: string): Promise<{ id?: string; error?: string }>
updateResume(id: string, patch: { title?: string; about?: string }): Promise<{ error?: string }>
deleteResume(id: string): Promise<{ error?: string }>
duplicateResume(id: string): Promise<{ id?: string; error?: string }>
listResumeContacts(resumeId: string): Promise<ResumeContact[]>
saveResumeContacts(resumeId: string, contacts: { label: string; value: string; type: string }[]): Promise<{ error?: string }>
listResumeItems(resumeId: string): Promise<ResumeItem[]>
addResumeItems(resumeId: string, items: { projectId: string; assetId: string }[]): Promise<{ error?: string }>
removeResumeItem(itemId: string): Promise<{ error?: string }>
reorderResumeItems(items: { id: string; position: number }[]): Promise<{ error?: string }>
updateResumeItemCaption(itemId: string, caption: string | null): Promise<{ error?: string }>
```

- [ ] **Step 1: Создать `src/app/actions/resumes.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";

export type Resume = {
  id: string;
  title: string;
  about: string | null;
  created_at: string;
  item_count: number;
};

export type ResumeContact = {
  id: string;
  resume_id: string;
  label: string;
  value: string;
  type: "text" | "url" | "phone" | "email";
  position: number;
};

export type ResumeItem = {
  id: string;
  resume_id: string;
  project_id: string;
  asset_id: string;
  position: number;
  caption: string | null;
  signedUrl?: string;
  asset_name: string;
  asset_type: "image" | "video";
  project_title: string;
};

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function listResumes(): Promise<Resume[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, about, created_at, resume_items(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    about: r.about,
    created_at: r.created_at,
    item_count: (r.resume_items as unknown as [{ count: number }])[0]?.count ?? 0,
  }));
}

export async function getResume(id: string): Promise<Resume | null> {
  const { supabase, user } = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("id, title, about, created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!data) return null;
  return { ...data, item_count: 0 };
}

export async function createResume(title: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data, error } = await supabase
    .from("resumes")
    .insert({ owner_id: user.id, title })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Ошибка" };
  revalidatePath("/admin/resumes");
  return { id: data.id };
}

export async function updateResume(
  id: string,
  patch: { title?: string; about?: string }
): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("resumes")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/resumes");
  revalidatePath(`/admin/resumes/${id}`);
  return {};
}

export async function deleteResume(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/resumes");
  return {};
}

export async function duplicateResume(id: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: orig } = await supabase
    .from("resumes")
    .select("title, about")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!orig) return { error: "Не найдено" };

  const { data: copy, error: err } = await supabase
    .from("resumes")
    .insert({ owner_id: user.id, title: `${orig.title} (копия)`, about: orig.about })
    .select("id")
    .single();
  if (err || !copy) return { error: err?.message };

  const [{ data: contacts }, { data: items }] = await Promise.all([
    supabase.from("resume_contacts").select("label,value,type,position").eq("resume_id", id),
    supabase.from("resume_items").select("project_id,asset_id,position,caption").eq("resume_id", id),
  ]);

  await Promise.all([
    contacts?.length
      ? supabase.from("resume_contacts").insert(contacts.map((c) => ({ resume_id: copy.id, ...c })))
      : Promise.resolve(),
    items?.length
      ? supabase.from("resume_items").insert(items.map((i) => ({ resume_id: copy.id, ...i })))
      : Promise.resolve(),
  ]);

  revalidatePath("/admin/resumes");
  return { id: copy.id };
}

export async function listResumeContacts(resumeId: string): Promise<ResumeContact[]> {
  const { supabase } = await getUser();
  const { data } = await supabase
    .from("resume_contacts")
    .select("*")
    .eq("resume_id", resumeId)
    .order("position");
  return (data ?? []) as ResumeContact[];
}

export async function saveResumeContacts(
  resumeId: string,
  contacts: { label: string; value: string; type: string }[]
): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  await supabase.from("resume_contacts").delete().eq("resume_id", resumeId);

  if (contacts.length > 0) {
    const { error } = await supabase.from("resume_contacts").insert(
      contacts.map((c, i) => ({ resume_id: resumeId, ...c, position: i }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/resumes/${resumeId}`);
  return {};
}

export async function listResumeItems(resumeId: string): Promise<ResumeItem[]> {
  const { supabase } = await getUser();

  const { data, error } = await supabase
    .from("resume_items")
    .select("id, resume_id, project_id, asset_id, position, caption, media_assets(name, type, storage_path), projects(title)")
    .eq("resume_id", resumeId)
    .order("position");

  if (error || !data) return [];

  return Promise.all(
    data.map(async (item) => {
      const a = item.media_assets as unknown as { name: string; type: string; storage_path: string } | null;
      const p = item.projects as unknown as { title: string } | null;
      return {
        id: item.id,
        resume_id: item.resume_id,
        project_id: item.project_id,
        asset_id: item.asset_id,
        position: item.position,
        caption: item.caption,
        asset_name: a?.name ?? "",
        asset_type: (a?.type ?? "image") as "image" | "video",
        project_title: p?.title ?? "",
        signedUrl: a?.storage_path ? await getSignedUrl(a.storage_path).catch(() => undefined) : undefined,
      };
    })
  );
}

export async function addResumeItems(
  resumeId: string,
  items: { projectId: string; assetId: string }[]
): Promise<{ error?: string }> {
  const { supabase } = await getUser();

  const { data: existing } = await supabase
    .from("resume_items")
    .select("position")
    .eq("resume_id", resumeId)
    .order("position", { ascending: false })
    .limit(1);

  const start = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("resume_items").insert(
    items.map(({ projectId, assetId }, i) => ({
      resume_id: resumeId,
      project_id: projectId,
      asset_id: assetId,
      position: start + i,
    }))
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/resumes/${resumeId}`);
  return {};
}

export async function removeResumeItem(itemId: string): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  const { error } = await supabase.from("resume_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}

export async function reorderResumeItems(
  items: { id: string; position: number }[]
): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  await Promise.all(items.map(({ id, position }) =>
    supabase.from("resume_items").update({ position }).eq("id", id)
  ));
  return {};
}

export async function updateResumeItemCaption(
  itemId: string,
  caption: string | null
): Promise<{ error?: string }> {
  const { supabase } = await getUser();
  const { error } = await supabase.from("resume_items").update({ caption }).eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` без ошибок.

- [ ] **Step 3: Commit**
```bash
git add src/app/actions/resumes.ts
git commit -m "feat: server actions для resumes (CRUD, contacts, items)"
```

---

### Task 5: Media usage counts

**Files:** Modify `src/app/actions/media.ts`

- [ ] **Step 1: Расширить тип `MediaAsset`** — добавить после `signedUrl?: string;`:
```typescript
projectCount: number;
resumeCount: number;
```

- [ ] **Step 2: Обновить `.select()` в `listAssets()`** — заменить существующий select:
```typescript
const { data, error } = await supabase
  .from("media_assets")
  .select("id, name, type, storage_path, size_bytes, mime_type, tags, description, created_at, project_items(count), resume_items(count)")
  .eq("owner_id", user.id)
  .order("created_at", { ascending: false });
```

- [ ] **Step 3: Обновить маппинг в `listAssets()`** — заменить `assets` map:
```typescript
const assets = await Promise.all(
  data.map(async (a) => ({
    ...a,
    projectCount: (a.project_items as unknown as [{ count: number }])[0]?.count ?? 0,
    resumeCount: (a.resume_items as unknown as [{ count: number }])[0]?.count ?? 0,
    signedUrl: await getSignedUrl(a.storage_path).catch(() => undefined),
  }))
);
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` без ошибок.

- [ ] **Step 5: Commit**
```bash
git add src/app/actions/media.ts
git commit -m "feat: добавить projectCount/resumeCount в listAssets"
```

---

### Task 6: SortableGrid component

**Files:** Create `src/components/sortable-grid.tsx`

**Interface produced:**
```typescript
SortableGrid<T extends { id: string }>(props: {
  items: T[]
  onChange: (newItems: T[]) => void
  renderItem: (item: T, dragProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode
  className?: string
}): JSX.Element
```

- [ ] **Step 1: Создать `src/components/sortable-grid.tsx`**

```typescript
"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableGridProps<T extends { id: string }> = {
  items: T[];
  onChange: (newItems: T[]) => void;
  renderItem: (item: T, dragProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
  className?: string;
};

function SortableItem<T extends { id: string }>({
  item,
  renderItem,
}: {
  item: T;
  renderItem: SortableGridProps<T>["renderItem"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      {renderItem(item, { ...attributes, ...listeners })}
    </div>
  );
}

export function SortableGrid<T extends { id: string }>({
  items,
  onChange,
  renderItem,
  className,
}: SortableGridProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} item={item} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` без ошибок.

- [ ] **Step 3: Commit**
```bash
git add src/components/sortable-grid.tsx
git commit -m "feat: SortableGrid — generic DnD-сортировка (dnd-kit)"
```

---

### Task 7: MediaPickerModal

**Files:** Create `src/components/media-picker-modal.tsx`

**Interface produced:**
```typescript
MediaPickerModal(props: {
  open: boolean
  onClose: () => void
  excludedIds: string[]        // already in project — shown dimmed
  onConfirm: (ids: string[]) => Promise<void>
}): JSX.Element
```

- [ ] **Step 1: Создать `src/components/media-picker-modal.tsx`**

```typescript
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
    setLoading(true);
    setSelected(new Set());
    listAssets().then((data) => { setAssets(data); setLoading(false); });
  }, [open]);

  function toggle(id: string) {
    if (excludedIds.includes(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` без ошибок.

- [ ] **Step 3: Commit**
```bash
git add src/components/media-picker-modal.tsx
git commit -m "feat: MediaPickerModal — выбор из медиатеки"
```

---

### Task 8: Projects list page

**Files:**
- Create `src/app/admin/projects/page.tsx`
- Create `src/app/admin/projects/delete-project-button.tsx`
- Create `src/app/admin/projects/duplicate-project-button.tsx`

- [ ] **Step 1: Создать `src/app/admin/projects/delete-project-button.tsx`**

```typescript
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
```

- [ ] **Step 2: Создать `src/app/admin/projects/duplicate-project-button.tsx`**

```typescript
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
```

- [ ] **Step 3: Создать `src/app/admin/projects/page.tsx`**

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { listProjects, createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteProjectButton } from "./delete-project-button";
import { DuplicateProjectButton } from "./duplicate-project-button";

export const metadata: Metadata = { title: "Проекты" };

export default async function ProjectsPage() {
  const projects = await listProjects();

  async function handleCreate() {
    "use server";
    const result = await createProject("Новый проект");
    if (result.id) redirect(`/admin/projects/${result.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
          <p className="mt-1 text-sm text-muted-foreground">Тематические подборки работ — основа для резюме.</p>
        </div>
        <form action={handleCreate}>
          <Button size="sm" className="gap-2"><Plus className="size-4" />Новый проект</Button>
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="size-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Проектов пока нет — создай первый</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {p.item_count} медиафайл(ов) · {new Date(p.created_at).toLocaleDateString("ru")}
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 rounded-full">
                    <Link href={`/admin/projects/${p.id}`}>Открыть</Link>
                  </Button>
                  <DuplicateProjectButton id={p.id} />
                  <DeleteProjectButton id={p.id} title={p.title} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify** — `/admin/projects` открывается, создание проекта редиректит в редактор (404 — ОК, до Task 9).

- [ ] **Step 5: Commit**
```bash
git add src/app/admin/projects/
git commit -m "feat: страница списка проектов (/admin/projects)"
```

---

### Task 9: Project editor

**Files:**
- Create `src/app/admin/projects/[id]/page.tsx`
- Create `src/app/admin/projects/[id]/project-editor.tsx`

- [ ] **Step 1: Создать `src/app/admin/projects/[id]/page.tsx`**

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjectItems } from "@/app/actions/projects";
import { ProjectEditor } from "./project-editor";

export const metadata: Metadata = { title: "Редактор проекта" };

export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description")
    .eq("id", id)
    .single();

  if (!project) notFound();
  const items = await listProjectItems(id);
  return <ProjectEditor project={project} initialItems={items} />;
}
```

- [ ] **Step 2: Создать `src/app/admin/projects/[id]/project-editor.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  updateProject, addProjectItems, removeProjectItem,
  reorderProjectItems, updateProjectItemCaption, listProjectItems,
  type ProjectItem,
} from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SortableGrid } from "@/components/sortable-grid";
import { MediaPickerModal } from "@/components/media-picker-modal";

type Project = { id: string; title: string; description: string | null };

export function ProjectEditor({ project, initialItems }: { project: Project; initialItems: ProjectItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [items, setItems] = useState(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, startSaving] = useTransition();

  function handleSaveMeta() {
    startSaving(async () => { await updateProject(project.id, { title, description }); router.refresh(); });
  }

  async function handleAddItems(assetIds: string[]) {
    await addProjectItems(project.id, assetIds);
    setItems(await listProjectItems(project.id));
  }

  function handleReorder(newItems: ProjectItem[]) {
    setItems(newItems);
    reorderProjectItems(newItems.map((item, i) => ({ id: item.id, position: i })));
  }

  function handleRemove(itemId: string) {
    if (!confirm("Убрать файл из проекта?")) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    removeProjectItem(itemId);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
          <Link href="/admin/projects"><ArrowLeft className="size-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Редактор проекта</h1>
      </div>

      {/* Основное */}
      <section className="space-y-4 rounded-xl border border-border/70 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Основное</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Название</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Описание</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание проекта — увидит работодатель" rows={3} />
          </div>
        </div>
        <Button onClick={handleSaveMeta} disabled={saving} size="sm">
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Сохранить
        </Button>
      </section>

      {/* Медиа */}
      <section className="space-y-4 rounded-xl border border-border/70 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Медиа ({items.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="gap-2">
            <Plus className="size-4" />Добавить
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет медиафайлов — добавь из медиатеки</p>
        ) : (
          <SortableGrid
            items={items}
            onChange={handleReorder}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
            renderItem={(item, dragProps) => (
              <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                <div className="aspect-square overflow-hidden">
                  {item.signedUrl && item.asset_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.signedUrl} alt={item.asset_name} className="h-full w-full object-cover" draggable={false} />
                  ) : item.signedUrl ? (
                    <video src={item.signedUrl} className="h-full w-full object-cover" muted preload="metadata" />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
                <div {...dragProps} className="absolute left-2 top-2 cursor-grab rounded bg-black/50 p-1 opacity-0 group-hover:opacity-100">
                  <GripVertical className="size-3.5 text-white" />
                </div>
                <button type="button" onClick={() => handleRemove(item.id)}
                  className="absolute right-2 top-2 rounded bg-black/50 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/80">
                  <Trash2 className="size-3.5 text-white" />
                </button>
                <div className="p-2">
                  <input type="text" defaultValue={item.caption ?? ""}
                    onBlur={(e) => updateProjectItemCaption(item.id, e.target.value || null)}
                    placeholder="Подпись…"
                    className="w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40" />
                </div>
              </div>
            )}
          />
        )}
      </section>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludedIds={items.map((i) => i.asset_id)}
        onConfirm={handleAddItems}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify** — создать проект → открыть редактор → добавить медиа → DnD работает → подпись сохраняется при blur → перезагрузка страницы сохраняет порядок.

- [ ] **Step 4: Commit**
```bash
git add src/app/admin/projects/[id]/
git commit -m "feat: редактор проекта — метаданные, медиа, DnD-сортировка"
```

---

### Task 10: Resumes list page

**Files:**
- Create `src/app/admin/resumes/page.tsx`
- Create `src/app/admin/resumes/delete-resume-button.tsx`
- Create `src/app/admin/resumes/duplicate-resume-button.tsx`

- [ ] **Step 1: Создать `src/app/admin/resumes/delete-resume-button.tsx`**

```typescript
"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteResume } from "@/app/actions/resumes";
import { Button } from "@/components/ui/button";

export function DeleteResumeButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive/10" disabled={pending}
      onClick={() => {
        if (!confirm(`Удалить резюме «${title}»?`)) return;
        start(async () => { await deleteResume(id); router.refresh(); });
      }}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
```

- [ ] **Step 2: Создать `src/app/admin/resumes/duplicate-resume-button.tsx`**

```typescript
"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { duplicateResume } from "@/app/actions/resumes";
import { Button } from "@/components/ui/button";

export function DuplicateResumeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="icon" variant="ghost" className="size-8" disabled={pending}
      onClick={() => start(async () => { await duplicateResume(id); router.refresh(); })}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
```

- [ ] **Step 3: Создать `src/app/admin/resumes/page.tsx`**

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { listResumes, createResume } from "@/app/actions/resumes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteResumeButton } from "./delete-resume-button";
import { DuplicateResumeButton } from "./duplicate-resume-button";

export const metadata: Metadata = { title: "Резюме" };

export default async function ResumesPage() {
  const resumes = await listResumes();

  async function handleCreate() {
    "use server";
    const result = await createResume("Новое резюме");
    if (result.id) redirect(`/admin/resumes/${result.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Резюме</h1>
          <p className="mt-1 text-sm text-muted-foreground">Подборки работ под конкретные вакансии.</p>
        </div>
        <form action={handleCreate}>
          <Button size="sm" className="gap-2"><Plus className="size-4" />Новое резюме</Button>
        </form>
      </div>

      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="size-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Резюме пока нет — создай первое</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <Card key={r.id} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {r.item_count} работ · {new Date(r.created_at).toLocaleDateString("ru")}
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 rounded-full">
                    <Link href={`/admin/resumes/${r.id}`}>Открыть</Link>
                  </Button>
                  <DuplicateResumeButton id={r.id} />
                  <DeleteResumeButton id={r.id} title={r.title} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify** — `/admin/resumes` открывается, создание редиректит в редактор.

- [ ] **Step 5: Commit**
```bash
git add src/app/admin/resumes/
git commit -m "feat: страница списка резюме (/admin/resumes)"
```

---

### Task 11: Resume editor

**Files:**
- Create `src/app/admin/resumes/[id]/page.tsx`
- Create `src/app/admin/resumes/[id]/resume-editor.tsx`
- Create `src/components/project-picker-modal.tsx`

- [ ] **Step 1: Создать `src/app/admin/resumes/[id]/page.tsx`**

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResume, listResumeContacts, listResumeItems, listResumes } from "@/app/actions/resumes";
import { listProjects } from "@/app/actions/projects";
import { ResumeEditor } from "./resume-editor";

export const metadata: Metadata = { title: "Редактор резюме" };

export default async function ResumeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [resume, contacts, items, projects, allResumes] = await Promise.all([
    getResume(id),
    listResumeContacts(id),
    listResumeItems(id),
    listProjects(),
    listResumes(),
  ]);

  if (!resume) notFound();

  return (
    <ResumeEditor
      resume={resume}
      initialContacts={contacts}
      initialItems={items}
      projects={projects}
      otherResumes={allResumes.filter((r) => r.id !== id)}
    />
  );
}
```

- [ ] **Step 2: Создать `src/components/project-picker-modal.tsx`**

```typescript
"use client";

import { useState } from "react";
import { ArrowLeft, Film, Loader2, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listProjectItems, type ProjectItem, type Project } from "@/app/actions/projects";
import { cn } from "@/lib/utils";

type ProjectPickerModalProps = {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  existingAssetIds: string[];
  onConfirm: (items: { projectId: string; assetId: string }[]) => Promise<void>;
};

export function ProjectPickerModal({ open, onClose, projects, existingAssetIds, onConfirm }: ProjectPickerModalProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  async function handleSelectProject(project: Project) {
    setSelectedProject(project);
    setSelected(new Set());
    setLoadingItems(true);
    setProjectItems(await listProjectItems(project.id));
    setLoadingItems(false);
  }

  function handleBack() {
    setSelectedProject(null);
    setProjectItems([]);
    setSelected(new Set());
  }

  function handleClose() { handleBack(); onClose(); }

  async function handleConfirm() {
    if (!selectedProject || selected.size === 0) return;
    setConfirming(true);
    await onConfirm(Array.from(selected).map((assetId) => ({ projectId: selectedProject.id, assetId })));
    setConfirming(false);
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedProject && (
              <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
              </button>
            )}
            {selectedProject ? selectedProject.title : "Выбрать проект"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {!selectedProject ? (
            projects.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Нет проектов — создай их в разделе «Проекты»
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {projects.map((project) => (
                  <button key={project.id} type="button" onClick={() => handleSelectProject(project)}
                    className="flex items-center gap-3 rounded-lg border border-border/70 p-3 text-left hover:border-border hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{project.title}</p>
                      <p className="text-xs text-muted-foreground">{project.item_count} медиафайл(ов)</p>
                    </div>
                    <ArrowLeft className="size-4 shrink-0 rotate-180 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            )
          ) : loadingItems ? (
            <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : projectItems.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">В проекте нет медиафайлов</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {projectItems.map((item) => {
                const excluded = existingAssetIds.includes(item.asset_id);
                const isSelected = selected.has(item.asset_id);
                return (
                  <button key={item.id} type="button" disabled={excluded}
                    onClick={() => {
                      if (excluded) return;
                      setSelected((prev) => { const next = new Set(prev); next.has(item.asset_id) ? next.delete(item.asset_id) : next.add(item.asset_id); return next; });
                    }}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      excluded ? "cursor-not-allowed opacity-40 border-transparent"
                        : isSelected ? "border-primary"
                        : "border-transparent hover:border-border"
                    )}>
                    {item.signedUrl && item.asset_type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.signedUrl} alt={item.asset_name} className="h-full w-full object-cover" draggable={false} />
                    ) : item.signedUrl ? (
                      <video src={item.signedUrl} className="h-full w-full object-cover" muted preload="metadata" />
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
                    {item.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
                        <p className="truncate text-[10px] text-white">{item.caption}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={confirming}>Отмена</Button>
          {selectedProject && (
            <Button onClick={handleConfirm} disabled={selected.size === 0 || confirming}>
              {confirming && <Loader2 className="mr-2 size-4 animate-spin" />}
              Добавить {selected.size > 0 ? `${selected.size} работ(ы)` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Создать `src/app/admin/resumes/[id]/resume-editor.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  updateResume, saveResumeContacts, listResumeContacts,
  addResumeItems, removeResumeItem, reorderResumeItems,
  updateResumeItemCaption, listResumeItems,
  type Resume, type ResumeContact, type ResumeItem,
} from "@/app/actions/resumes";
import { type Project } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SortableGrid } from "@/components/sortable-grid";
import { ProjectPickerModal } from "@/components/project-picker-modal";

type ContactRow = { label: string; value: string; type: string };

export function ResumeEditor({
  resume, initialContacts, initialItems, projects, otherResumes,
}: {
  resume: Resume;
  initialContacts: ResumeContact[];
  initialItems: ResumeItem[];
  projects: Project[];
  otherResumes: Resume[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(resume.title);
  const [about, setAbout] = useState(resume.about ?? "");
  const [contacts, setContacts] = useState<ContactRow[]>(
    initialContacts.map(({ label, value, type }) => ({ label, value, type }))
  );
  const [items, setItems] = useState(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copyFromId, setCopyFromId] = useState("");
  const [savingMeta, startSavingMeta] = useTransition();
  const [savingContacts, startSavingContacts] = useTransition();

  function handleSaveMeta() {
    startSavingMeta(async () => { await updateResume(resume.id, { title, about }); router.refresh(); });
  }

  function handleSaveContacts() {
    startSavingContacts(async () => { await saveResumeContacts(resume.id, contacts); router.refresh(); });
  }

  async function handleCopyContacts() {
    if (!copyFromId || !confirm("Контакты будут заменены. Продолжить?")) return;
    const src = await listResumeContacts(copyFromId);
    setContacts(src.map(({ label, value, type }) => ({ label, value, type })));
    setCopyFromId("");
  }

  function moveContact(i: number, dir: -1 | 1) {
    const next = [...contacts];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setContacts(next);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
          <Link href="/admin/resumes"><ArrowLeft className="size-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Редактор резюме</h1>
      </div>

      {/* Section 1: Basic */}
      <section className="space-y-4 rounded-xl border border-border/70 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Основное</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Название резюме</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Обо мне</label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)}
              placeholder="Краткое описание — специализации, стиль…" rows={4} />
          </div>
        </div>
        <Button onClick={handleSaveMeta} disabled={savingMeta} size="sm">
          {savingMeta && <Loader2 className="mr-2 size-4 animate-spin" />}Сохранить
        </Button>
      </section>

      {/* Section 2: Contacts */}
      <section className="space-y-4 rounded-xl border border-border/70 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Контакты</h2>
          <Button size="sm" variant="outline" className="gap-2"
            onClick={() => setContacts((p) => [...p, { label: "", value: "", type: "text" }])}>
            <Plus className="size-4" />Добавить
          </Button>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Контакты не добавлены</p>
        ) : (
          <div className="space-y-2">
            {contacts.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 text-muted-foreground/40">
                  <button type="button" disabled={i === 0} onClick={() => moveContact(i, -1)}
                    className="hover:text-foreground disabled:opacity-20 text-xs leading-none">↑</button>
                  <button type="button" disabled={i === contacts.length - 1} onClick={() => moveContact(i, 1)}
                    className="hover:text-foreground disabled:opacity-20 text-xs leading-none">↓</button>
                </div>
                <Input value={row.label} placeholder="Метка (Email…)"
                  onChange={(e) => setContacts((p) => p.map((r, j) => j === i ? { ...r, label: e.target.value } : r))}
                  className="w-32 shrink-0 text-sm" />
                <Input value={row.value} placeholder="Значение"
                  onChange={(e) => setContacts((p) => p.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                  className="flex-1 text-sm" />
                <Select value={row.type}
                  onValueChange={(v) => setContacts((p) => p.map((r, j) => j === i ? { ...r, type: v } : r))}>
                  <SelectTrigger className="w-28 shrink-0 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Текст</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Телефон</SelectItem>
                    <SelectItem value="url">Ссылка</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => setContacts((p) => p.filter((_, j) => j !== i))}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {otherResumes.length > 0 && (
          <div className="flex items-center gap-2 border-t border-border/50 pt-3">
            <Select value={copyFromId} onValueChange={setCopyFromId}>
              <SelectTrigger className="flex-1 text-sm"><SelectValue placeholder="Скопировать из резюме…" /></SelectTrigger>
              <SelectContent>
                {otherResumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleCopyContacts} disabled={!copyFromId}>
              Скопировать
            </Button>
          </div>
        )}

        <Button onClick={handleSaveContacts} disabled={savingContacts} size="sm">
          {savingContacts && <Loader2 className="mr-2 size-4 animate-spin" />}Сохранить контакты
        </Button>
      </section>

      {/* Section 3: Works */}
      <section className="space-y-4 rounded-xl border border-border/70 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Работы ({items.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="gap-2">
            <Plus className="size-4" />Добавить из проекта
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Добавь работы из проектов</p>
        ) : (
          <SortableGrid
            items={items}
            onChange={(newItems) => {
              setItems(newItems);
              reorderResumeItems(newItems.map((item, i) => ({ id: item.id, position: i })));
            }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
            renderItem={(item, dragProps) => (
              <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                <div className="aspect-square overflow-hidden">
                  {item.signedUrl && item.asset_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.signedUrl} alt={item.asset_name} className="h-full w-full object-cover" draggable={false} />
                  ) : item.signedUrl ? (
                    <video src={item.signedUrl} className="h-full w-full object-cover" muted preload="metadata" />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
                <div {...dragProps} className="absolute left-2 top-2 cursor-grab rounded bg-black/50 p-1 opacity-0 group-hover:opacity-100">
                  <GripVertical className="size-3.5 text-white" />
                </div>
                <button type="button" onClick={() => {
                  if (!confirm("Убрать работу из резюме?")) return;
                  setItems((p) => p.filter((i) => i.id !== item.id));
                  removeResumeItem(item.id);
                }} className="absolute right-2 top-2 rounded bg-black/50 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/80">
                  <Trash2 className="size-3.5 text-white" />
                </button>
                <div className="absolute bottom-8 left-2 opacity-0 group-hover:opacity-100">
                  <Badge variant="secondary" className="border-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {item.project_title}
                  </Badge>
                </div>
                <div className="p-2">
                  <input type="text" defaultValue={item.caption ?? ""}
                    onBlur={(e) => updateResumeItemCaption(item.id, e.target.value || null)}
                    placeholder="Подпись…"
                    className="w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40" />
                </div>
              </div>
            )}
          />
        )}

        <ProjectPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          projects={projects}
          existingAssetIds={items.map((i) => i.asset_id)}
          onConfirm={async (newItems) => {
            await addResumeItems(resume.id, newItems);
            setItems(await listResumeItems(resume.id));
          }}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verify** — полный smoke-test редактора резюме:
  1. Название + «Обо мне» сохраняются
  2. Контакты: добавить, переупорядочить ↑↓, удалить, сохранить — перезагрузка сохраняет
  3. «Скопировать из резюме» — поля перезаписываются из другого резюме
  4. «Добавить из проекта» → выбор проекта → сетка медиа → добавить → отображается в Works
  5. DnD в Works работает, порядок сохраняется при перезагрузке
  6. Бейдж проекта появляется при наведении

- [ ] **Step 5: Commit**
```bash
git add src/app/admin/resumes/[id]/ src/components/project-picker-modal.tsx
git commit -m "feat: редактор резюме — основное, контакты, работы из проектов"
```

---

### Task 12: Media card badges + Sheet

**Files:** Modify `src/app/admin/media/media-grid.tsx`

- [ ] **Step 1: Добавить импорты в `src/app/admin/media/media-grid.tsx`**

```typescript
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Добавить state в `AssetCard`** (после `const [hovered, setHovered] = useState(false);`):

```typescript
const [sheetOpen, setSheetOpen] = useState(false);
```

- [ ] **Step 3: Добавить бейджи в оверлей** — внутри `<div className="absolute inset-x-0 bottom-0...">`, перед `<div className="min-w-0">`:

```typescript
{(asset.projectCount > 0 || asset.resumeCount > 0) && (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); setSheetOpen(true); }}
    className="flex shrink-0 items-center gap-1"
  >
    {asset.projectCount > 0 && (
      <Badge className="border-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/80">
        {asset.projectCount} проект(ов)
      </Badge>
    )}
    {asset.resumeCount > 0 && (
      <Badge className="border-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/80">
        {asset.resumeCount} резюме
      </Badge>
    )}
  </button>
)}
```

- [ ] **Step 4: Добавить Sheet после закрывающего `</div>` карточки** (перед `return` заканчивается):

```typescript
<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle className="text-base truncate">{asset.name}</SheetTitle>
    </SheetHeader>
    <div className="mt-6 space-y-6">
      {asset.projectCount > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Проекты</p>
          <p className="text-sm text-muted-foreground">
            Используется в {asset.projectCount} проект(ах).{" "}
            <Link href="/admin/projects" className="underline underline-offset-2"
              onClick={() => setSheetOpen(false)}>
              Открыть проекты →
            </Link>
          </p>
        </div>
      )}
      {asset.resumeCount > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Резюме</p>
          <p className="text-sm text-muted-foreground">
            Используется в {asset.resumeCount} резюме.{" "}
            <Link href="/admin/resumes" className="underline underline-offset-2"
              onClick={() => setSheetOpen(false)}>
              Открыть резюме →
            </Link>
          </p>
        </div>
      )}
    </div>
  </SheetContent>
</Sheet>
```

- [ ] **Step 5: Verify** — добавить медиафайл в проект, открыть /admin/media — бейдж «1 проект(ов)» появляется, клик → Sheet справа с ссылкой.

- [ ] **Step 6: Commit**
```bash
git add src/app/admin/media/media-grid.tsx
git commit -m "feat: бейджи использования + Sheet на карточках медиатеки"
```

---

### Task 13: Nav + overview + roadmap

**Files:** `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `docs/roadmap.md`

- [ ] **Step 1: Обновить `src/app/admin/layout.tsx`** — заменить `navItems` и импорты:

```typescript
import { Images, FolderOpen, FileText, LogOut } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Обзор", icon: Images },
  { href: "/admin/media", label: "Медиатека", icon: Images },
  { href: "/admin/projects", label: "Проекты", icon: FolderOpen },
  { href: "/admin/resumes", label: "Резюме", icon: FileText },
];
```

- [ ] **Step 2: Обновить `src/app/admin/page.tsx`** — добавить Проекты в `sections`, удалить плейсхолдер-абзац внизу:

```typescript
import { Images, FolderOpen, FileText, Link2, ArrowRight } from "lucide-react";

const sections = [
  {
    href: "/admin/media",
    icon: Images,
    title: "Медиатека",
    description: "Загружай фото и видео — основа всех подборок.",
    cta: "Перейти в медиатеку",
  },
  {
    href: "/admin/projects",
    icon: FolderOpen,
    title: "Проекты",
    description: "Группируй медиафайлы в тематические подборки с описанием.",
    cta: "Мои проекты",
  },
  {
    href: "/admin/resumes",
    icon: FileText,
    title: "Резюме",
    description: "Собирай подборки из проектов под каждую вакансию.",
    cta: "Мои резюме",
  },
  {
    href: "/admin/links",
    icon: Link2,
    title: "Ссылки",
    description: "Создавай защищённые ссылки для конкретного получателя.",
    cta: "Управлять ссылками",
  },
];
```

Удалить `<p className="text-xs text-muted-foreground">Медиатека, редактор резюме...` в конце JSX.

- [ ] **Step 3: Отметить Этап 3 в `docs/roadmap.md`**

Заменить блок `## Этап 3`:
```markdown
## Этап 3 — Конструктор резюме ✅
- [x] Схема БД: projects, project_items, resumes, resume_contacts, resume_items + RLS + индексы
- [x] Проекты: создать/дублировать/удалить; редактор с медиа (DnD-сортировка, подписи)
- [x] Резюме: создать/дублировать/удалить; редактор — название, «обо мне»
- [x] Контакты резюме: гибкие поля label/value/type, ↑↓ порядок, «скопировать из резюме»
- [x] Работы резюме: выбор из проектов (ProjectPickerModal), DnD-сортировка, подписи, бейдж проекта
- [x] MediaPickerModal: добавление медиа в проект из библиотеки
- [x] Медиатека: бейджи «N проект(ов)» / «N резюме» + Sheet-панель
- [x] Навигация кабинета: Проекты + Резюме добавлены
```

- [ ] **Step 4: Финальный smoke-test**

```bash
npm run dev
```

1. `/admin` — 4 карточки, все ссылки рабочие
2. `/admin/projects` → создать → редактор → добавить медиа → DnD → сохранить название
3. `/admin/resumes` → создать → редактор → контакты → работы из проекта → DnD
4. `/admin/media` → бейдж на карточке → Sheet → ссылка на /admin/projects

```bash
npm run build
```
Ожидается: сборка без ошибок.

- [ ] **Step 5: Commit**
```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx docs/roadmap.md
git commit -m "feat: Этап 3 завершён — навигация, обзор, roadmap обновлён"
```
