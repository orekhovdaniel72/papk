import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSignedUrl } from "@/lib/storage";

// Выдаёт подписанный URL только если slug валиден и asset принадлежит резюме этой ссылки
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assetId } = await params;
  const slug = req.nextUrl.searchParams.get("slug");

  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const db = createServiceClient();

  // Проверяем ссылку
  const { data: link } = await db
    .from("share_links")
    .select("id, resume_id, revoked, expires_at, view_limit, view_count")
    .eq("slug", slug)
    .maybeSingle();

  if (!link || link.revoked) return new NextResponse(null, { status: 403 });
  if (link.expires_at && new Date(link.expires_at) < new Date())
    return new NextResponse(null, { status: 403 });
  if (link.view_limit !== null && link.view_count >= link.view_limit)
    return new NextResponse(null, { status: 403 });

  // Проверяем что asset входит в это резюме (через resume_items)
  const { data: item } = await db
    .from("resume_items")
    .select("id")
    .eq("resume_id", link.resume_id)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (!item) return new NextResponse(null, { status: 403 });

  // Берём storage_path из media_assets
  const { data: asset } = await db
    .from("media_assets")
    .select("storage_path")
    .eq("id", assetId)
    .single();

  if (!asset) return new NextResponse(null, { status: 404 });

  const signedUrl = await getSignedUrl(asset.storage_path).catch(() => null);
  if (!signedUrl) return new NextResponse(null, { status: 500 });

  // Редирект на подписанный URL — браузер загрузит файл напрямую из Supabase Storage
  return NextResponse.redirect(signedUrl);
}
