// app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 認証後にリダイレクトさせたい先
  const next = searchParams.get('next') ?? '/';

  if (code) {
    // 1. 先にリダイレクト先のレスポンスオブジェクトを作成します
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          // 2. 作成したレスポンスに対してCookieを設定します
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 3. Cookie設定済みのレスポンスを返します
      return response;
    }
  }

  // エラー等の場合
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}