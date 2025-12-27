import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ★重要: ここで createClient していたのを削除し、関数の中に移動します

// この行を追加（ビルド時に静的生成されるのを防ぐ）
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. セキュリティチェック
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    // 環境変数がない場合のガードを入れる
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Environment variables missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (key !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ★修正: ここでクライアントを作成する（使う直前に作る）
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 2. 昨日以前の日付を取得
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

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
        const parts = event.image_url.split('/event-images/');
        if (parts.length > 1) {
          // デコード処理を入れておく
          filesToDelete.push(decodeURIComponent(parts[1]));
          eventIdsToUpdate.push(event.id);
        }
      }
    });

    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabaseAdmin
        .storage
        .from('event-images')
        .remove(filesToDelete);

      if (storageError) throw storageError;

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