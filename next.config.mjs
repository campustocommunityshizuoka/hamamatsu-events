/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // ▼▼▼ 既存の設定（ビルドエラー無視など） ▼▼▼
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // ▲▲▲ ここまで ▲▲▲

  // ▼▼▼ ★ここから追加：セキュリティヘッダーの設定 ▼▼▼
  async headers() {
    return [
      {
        // 全てのページに適用
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN' // 自分のサイト以外での埋め込みを禁止
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // ファイル形式の偽装を防止
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin' // リンク遷移時の情報漏洩防止
          },
          {
            // CSP（コンテンツセキュリティポリシー）
            // 許可するもの：自分自身(self)、Supabaseの画像、Googleマップ、インラインスタイルなど
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.gstatic.com;", 
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              "img-src 'self' blob: data: https://*.supabase.co https://*.googleusercontent.com https://*.google.com;",
              "font-src 'self' data: https://fonts.gstatic.com;",
              "frame-src 'self' https://*.google.com https://*.googleusercontent.com;",
              // ★修正箇所：Cloudflare Workers (https://*.workers.dev) への通信を許可に追加
              "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://*.workers.dev;"
            ].join(' ').replace(/\s{2,}/g, ' ').trim()
          }
        ],
      },
    ];
  },
};

export default nextConfig;