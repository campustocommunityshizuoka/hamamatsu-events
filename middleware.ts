import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保護したいページ
  const protectedPaths = ['/login', '/register', '/forgot-password', '/update-password'];

  // 今のアクセス先が保護対象かどうかチェック
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    
    // Cookie「admin_access_token」を持っているか確認
    const hasAccessToken = request.cookies.has('admin_access_token');

    // 持っていなければトップページへリダイレクト
    if (!hasAccessToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Middlewareを適用するパスの設定
export const config = {
  matcher: [
    '/login',
    '/register',
    '/forgot-password',
    '/update-password',
  ],
};