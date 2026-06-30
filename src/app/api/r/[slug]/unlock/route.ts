import { NextRequest, NextResponse } from "next/server";

import { resolveShareLink, incrementViewCount } from "@/app/actions/share-links";
import { getPublicResume } from "@/app/actions/public-resume";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { linkId, resumeId } = await req.json();

  // Повторная проверка валидности ссылки (срок, лимит, отзыв)
  const { link, error } = await resolveShareLink(slug);
  if (error || !link || link.id !== linkId) {
    return NextResponse.json({ error: error ?? "Ссылка недействительна" }, { status: 403 });
  }

  await incrementViewCount(linkId);
  const resume = await getPublicResume(resumeId);
  if (!resume) return NextResponse.json({ error: "Резюме не найдено" }, { status: 404 });

  return NextResponse.json({ resume });
}
