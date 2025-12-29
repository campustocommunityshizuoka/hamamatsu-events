import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // 環境変数に設定したコードと一致するか確認
  if (code !== process.env.ADMIN_INVITE_CODE) {
    return NextResponse.json({ error: '無効な招待コードです' }, { status: 403 });
  }

  // ログイン画面へのリダイレクトを作成
  const response = NextResponse.redirect(new URL('/login', request.url));

  // 「通行手形」となるCookieを設定
  // ★変更: maxAge を 1日 (24時間 = 86400秒) に設定
  response.cookies.set('admin_access_token', 'granted', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1日有効
    path: '/',
  });

  return response;
}