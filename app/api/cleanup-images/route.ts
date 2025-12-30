import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// データの型定義（any回避のため）
interface EventRow {
  id: number;
  image_url: string | null;
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    // 1. セキュリティチェック
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Environment variables missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (key !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クライアントを作成
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 2. 「今日より前」の日付を取得
    // 現在時刻(UTCまたはサーバーのタイムゾーン)から日付部分のみ抽出 (例: "2025-12-30")
    const todayStr = new Date().toISOString().split('T')[0];

    // 3. 画像を持っていて、かつ開催日が「今日より前（今日を含まない）」のイベントを取得
    // .lt('event_date', todayStr) は event_date < "2025-12-30" を意味します
    const { data: expiredEvents, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('id, image_url')
      .lt('event_date', todayStr)
      .not('image_url', 'is', null)
      .returns<EventRow[]>(); // 型を指定

    if (fetchError) throw fetchError;

    if (!expiredEvents || expiredEvents.length === 0) {
      return NextResponse.json({ message: 'No expired images found' });
    }

    // 4. 画像の削除処理
    const filesToDelete: string[] = [];
    const eventIdsToUpdate: number[] = [];

    expiredEvents.forEach((event) => {
      if (event.image_url) {
        const parts = event.image_url.split('/event-images/');
        if (parts.length > 1) {
          // デコード処理
          filesToDelete.push(decodeURIComponent(parts[1]));
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

      // DBのimage_urlをnullに更新
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

  } catch (error: unknown) {
    // anyを使わず unknown として受け取り、型ガードで処理
    console.error('Cleanup error:', error);
    
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}