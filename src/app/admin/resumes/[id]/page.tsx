import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getResume, listResumeContacts, listResumeItems } from "@/app/actions/resumes";
import { listShareLinks } from "@/app/actions/share-links";
import { ShareLinksPanel } from "@/components/share-links-panel";
import { ResumeEditor } from "./resume-editor";

export const metadata: Metadata = { title: "Редактор резюме" };

export default async function ResumeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resume = await getResume(id);

  if (!resume) {
    notFound();
  }

  const [contacts, items, shareLinks] = await Promise.all([
    listResumeContacts(id),
    listResumeItems(id),
    listShareLinks(id),
  ]);

  return (
    <>
      <ResumeEditor resume={resume} initialContacts={contacts} initialItems={items} />
      <div className="mt-6">
        <ShareLinksPanel resumeId={id} initialLinks={shareLinks} />
      </div>
    </>
  );
}
