// app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // URLから認証コード(code)を取得
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  // 認証後にリダイレクトさせたい先（デフォルトはトップページ）
  const next = searchParams.get('next') ?? '/';

  if (code) {
    // Cookieを操作するための準備
    const cookieStore = request.cookies;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // ここはルートハンドラーなのでレスポンスでCookieを設定する準備が必要ですが、
            // exchangeCodeForSession内で処理されます
          },
          remove(name: string, options: CookieOptions) {
            // 同上
          },
        },
      }
    );

    // 認証コードをセッション（ログイン状態）に交換する
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 成功したら、指定されたページ（トップページなど）へ転送
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時やコードがない場合はエラー画面やログイン画面へ
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}