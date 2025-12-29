import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code !== process.env.ADMIN_INVITE_CODE) {
    return NextResponse.json({ error: '無効な招待コードです' }, { status: 403 });
  }

  // ★変更: ログイン画面ではなく「新規登録画面」へリダイレクト
  const response = NextResponse.redirect(new URL('/register', request.url));

  // 通行手形 (Cookie) を発行
  response.cookies.set('admin_access_token', 'granted', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1日有効
    path: '/',
  });

  return response;
}