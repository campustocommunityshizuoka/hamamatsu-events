// app/api/cleanup-images/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// サーバーサイド専用のクライアント作成（Service Role Keyを使用）
// 注意: このキーはサーバー側でのみ使用し、絶対にクライアント側に漏らさないこと
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // .env.localに設定が必要
);

export async function GET(request: Request) {
  try {
    // 1. セキュリティチェック (Cronジョブからのアクセスであることを確認)
    // Vercel Cronなどを使う場合、Authorizationヘッダーで保護するのが一般的です
    // 今回は簡易的に、URLパラメータにシークレットキーを持たせる方式にします
    // 例: /api/cleanup-images?key=MY_SECRET_KEY
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 昨日以前の日付を取得
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD形式

    // 3. 画像を持っていて、かつ開催日が過ぎたイベントを取得
    const { data: expiredEvents, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('id, image_url')
      .lt('event_date', yesterdayStr)
      .not('image_url', 'is', null);

    if (fetchError) throw fetchError;

    if (!expiredEvents || expiredEvents.length === 0) {
      return NextResponse.json({ message: 'No expired images found' });
    }

    // 4. 画像の削除処理
    const filesToDelete: string[] = [];
    const eventIdsToUpdate: number[] = [];

    expiredEvents.forEach((event) => {
      if (event.image_url) {
        // URLからパスを抽出 ( .../event-images/xxxx.jpg -> xxxx.jpg )
        const parts = event.image_url.split('/event-images/');
        if (parts.length > 1) {
          filesToDelete.push(parts[1]);
          eventIdsToUpdate.push(event.id);
        }
      }
    });

    if (filesToDelete.length > 0) {
      // Storageから削除
      const { error: storageError } = await supabaseAdmin
        .storage
        .from('event-images')
        .remove(filesToDelete);

      if (storageError) throw storageError;

      // DBを更新 (image_urlをNULLにする)
      const { error: dbError } = await supabaseAdmin
        .from('events')
        .update({ image_url: null })
        .in('id', eventIdsToUpdate);

      if (dbError) throw dbError;
    }

    return NextResponse.json({ 
      success: true, 
      deleted_count: filesToDelete.length,
      deleted_files: filesToDelete 
    });

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}