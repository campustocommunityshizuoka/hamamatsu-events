import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { formatDate, getDaysUntil } from '@/lib/utils';
// import PostButton from '@/app/components/PostButton'; // ★削除またはコメントアウト

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// 1ページあたりの表示件数
const PER_PAGE = 10;

type Event = {
  id: number;
  title: string;
  event_date: string;
  location: string | null;
  area: string | null;
  image_url: string | null;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
};

// 戻り値の型を変更（件数情報を含めるため）
type EventsResult = {
  events: Event[];
  total: number | null;
};

// ページ番号(page)を受け取るように修正
async function getEvents(page: number): Promise<EventsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { events: [], total: 0 };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().split('T')[0];
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // ページネーションの計算（何件目から何件目までを取得するか）
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from('events')
    .select(`
      id, title, event_date, location, area, image_url,
      profiles ( name, avatar_url ) 
    `, { count: 'exact' }) // count: 'exact' で全件数を取得
    .eq('is_hidden', false) 
    .gte('event_date', today)
    .lte('event_date', twoWeeksLater)
    .order('event_date', { ascending: true })
    .range(from, to); // 範囲指定を追加

  if (error) {
    console.error('Supabase Error:', error);
    return { events: [], total: 0 };
  }
  
  return { events: data as unknown as Event[], total: count };
}

// Next.js 15では searchParams は Promise になります
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // URLパラメータからページ番号を取得（デフォルトは1ページ目）
  const resolvedSearchParams = await searchParams;
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  
  // イベントデータと総件数を取得
  const { events, total } = await getEvents(page);
  
  // 総ページ数を計算
  const totalEvents = total || 0;
  const totalPages = Math.ceil(totalEvents / PER_PAGE);

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* ▼▼ ヘッダー ▼▼ */}
      <header className="bg-blue-700 text-white p-4 shadow-md sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full p-1 flex-shrink-0">
             <img src="/logo.png" alt="浜松市ロゴ" className="w-full h-full object-contain" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold tracking-wide leading-none">浜松イベント情報</h1>
            <p className="text-xs mt-1 text-sky-100">地域の催し物がすぐわかる</p>
          </div>
        </div>
        
        {/* ★投稿ボタン削除
        <div>
          <PostButton />
        </div>
        */}
      </header>
      {/* ▲▲ ここまで ▲▲ */}

      <div className="max-w-md mx-auto md:max-w-4xl p-4">
        {events.length === 0 && (
          <div className="bg-white p-8 rounded-lg text-center mt-10 shadow-sm border border-slate-200">
            <p className="text-xl text-slate-600 mb-2">
              {page === 1 ? '現在、予定されているイベントはありません。' : 'このページにイベントはありません。'}
            </p>
            {page > 1 && (
               <Link href="/" className="text-blue-600 hover:underline mt-4 block">先頭に戻る</Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {events.map((event, index) => {
            const statusLabel = getDaysUntil(event.event_date);
            const posterName = event.profiles?.name || '主催者不明';
            const posterIcon = event.profiles?.avatar_url;
            
            // 最初の3件以外は遅延読み込み(lazy)にする
            // これにより初期ロード時の通信量を大幅に削減
            const loadingType = index < 3 ? "eager" : "lazy";

            return (
              <Link key={event.id} href={`/events/${event.id}`} className="block group">
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg overflow-hidden transform transition duration-200 active:scale-95 border-b-4 border-slate-200">
                  
                  {/* 画像エリア */}
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title} 
                        loading={loadingType} // ▼▼ Lazy Loading実装箇所 ▼▼
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 text-lg font-bold">
                        No Image
                      </div>
                    )}
                    
                    {/* 開催までの日数 */}
                    {statusLabel && (
                      <span className="absolute top-2 right-2 bg-rose-600 text-white text-base font-bold px-3 py-1 rounded-full shadow border-2 border-white">
                        {statusLabel}
                      </span>
                    )}

                    {/* 地区表示 */}
                    {event.area && (
                      <span className="absolute bottom-2 left-2 bg-sky-100 text-sky-900 text-sm font-bold px-3 py-1.5 rounded shadow-sm border border-sky-200">
                        📍 {event.area}
                      </span>
                    )}

                  </div>

                  <div className="p-5">
                    <p className="text-blue-700 font-bold text-xl mb-2">
                      📅 {formatDate(event.event_date)}
                    </p>
                    
                    <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-3 line-clamp-2">
                      {event.title}
                    </h2>
                    
                    <div className="text-gray-600 text-base space-y-3">
                      <p className="line-clamp-1 flex items-center gap-1">
                        <span>📍</span>
                        {event.location || '場所の記載なし'}
                      </p>
                      
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden flex-shrink-0 border border-slate-200">
                          {posterIcon ? (
                            <img src={posterIcon} alt={posterName} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-full h-full text-slate-400 p-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 truncate text-base">{posterName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ▼▼ ページネーションボタン ▼▼ */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12 mb-8">
            {/* 前のページへ */}
            {page > 1 ? (
              <Link 
                href={`/?page=${page - 1}`}
                className="px-6 py-3 bg-white text-blue-700 border-2 border-blue-700 rounded-full font-bold shadow-sm hover:bg-blue-50 transition"
              >
                ← 前のページ
              </Link>
            ) : (
              <button disabled className="px-6 py-3 bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-full font-bold cursor-not-allowed">
                ← 前のページ
              </button>
            )}

            <span className="text-gray-600 font-bold">
              {page} / {totalPages}
            </span>

            {/* 次のページへ */}
            {page < totalPages ? (
              <Link 
                href={`/?page=${page + 1}`}
                className="px-6 py-3 bg-blue-700 text-white rounded-full font-bold shadow-md hover:bg-blue-800 transition"
              >
                次のページ →
              </Link>
            ) : (
              <button disabled className="px-6 py-3 bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-full font-bold cursor-not-allowed">
                次のページ →
              </button>
            )}
          </div>
        )}
        {/* ▲▲ ここまで ▲▲ */}
        
      </div>
    </main>
  );
}