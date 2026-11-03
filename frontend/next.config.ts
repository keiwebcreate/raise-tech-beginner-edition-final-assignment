import type { NextConfig } from "next";

// Laravel（API）の住所。開発は php85 artisan serve の 8000（詳細設計書 3.2・3.3）
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // 本番は、動かすのに要るものだけを1つのフォルダにまとめる（詳細設計書 7.1）
  output: "standalone",
  // 開発中は、/api と /sanctum を Laravel へ転送する。
  // ブラウザから見ると画面と API が同じ住所になり、Sanctum の SPA 認証がそのまま動く。
  // 本番は Nginx が振り分けるので、ここまで届かない
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/sanctum/:path*", destination: `${apiOrigin}/sanctum/:path*` },
    ];
  },
};

export default nextConfig;
