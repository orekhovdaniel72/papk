import type { Metadata } from "next";
import { Suspense } from "react";
import { Images } from "lucide-react";

import { listAssets } from "@/app/actions/media";
import { UploadZone } from "./upload-zone";
import { MediaGrid } from "./media-grid";

export const metadata: Metadata = { title: "Медиатека" };

async function AssetList() {
  const assets = await listAssets();
  return <MediaGrid assets={assets} />;
}

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Images className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Медиатека</h1>
      </div>

      <UploadZone />

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        }
      >
        <AssetList />
      </Suspense>
    </div>
  );
}
