import type { NextConfig } from "next";

// Supabase Storage хост — нужен для img-src / media-src подписанных URL
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js требует unsafe-inline/eval в dev
  `img-src 'self' data: blob: ${supabaseHost ? `https://${supabaseHost}` : ""}`,
  `media-src 'self' blob: ${supabaseHost ? `https://${supabaseHost}` : ""}`,
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'", // запрет встраивания в iframe
  "object-src 'none'",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Запрет сниффинга MIME — браузер не будет угадывать тип медиа
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Не отправлять Referer при переходе на внешние ресурсы
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
