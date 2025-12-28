import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { formatDate, getDaysUntil } from '@/lib/utils';
import PostButton from '@/app/components/PostButton';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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

async function getEvents(): Promise<Event[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().split('T')[0];
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, event_date, location, area, image_url,
      profiles ( name, avatar_url ) 
    `)
    .eq('is_hidden', false) 
    .gte('event_date', today)
    .lte('event_date', twoWeeksLater)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Supabase Error:', error);
    return [];
  }
  return data as unknown as Event[];
}

export default async function Home() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* ▼▼ ヘッダー修正 ▼▼ */}
      <header className="bg-blue-700 text-white p-4 shadow-md sticky top-0 z-20 flex justify-between items-center">
        {/* ロゴとテキストを横並びにするためのdiv */}
        <div className="flex items-center gap-3">
          {/* ▼▼ ロゴ画像の追加（publicフォルダに浜松市.pngがある前提） ▼▼ */}
          <div className="w-12 h-12 bg-white rounded-full p-1 flex-shrink-0">
             <img src="/logo.png" alt="浜松市ロゴ" className="w-full h-full object-contain" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold tracking-wide leading-none">浜松イベント情報</h1>
            <p className="text-xs mt-1 text-sky-100">地域の催し物がすぐわかる</p>
          </div>
        </div>
        
        <div>
          <PostButton />
        </div>
      </header>
      {/* ▲▲ ここまで ▲▲ */}

      <div className="max-w-md mx-auto md:max-w-4xl p-4">
        {events.length === 0 && (
          <div className="bg-white p-8 rounded-lg text-center mt-10 shadow-sm border border-slate-200">
            <p className="text-xl text-slate-600 mb-2">現在、予定されている<br/>イベントはありません。</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {events.map((event) => {
            const statusLabel = getDaysUntil(event.event_date);
            const posterName = event.profiles?.name || '主催者不明';
            const posterIcon = event.profiles?.avatar_url;
            
            return (
              <Link key={event.id} href={`/events/${event.id}`} className="block group">
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg overflow-hidden transform transition duration-200 active:scale-95 border-b-4 border-slate-200">
                  
                  {/* 画像エリア */}
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title} 
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

                    {/* ▼▼ 地区表示：文字サイズを大きく(text-xs -> text-sm)、余白も拡大 ▼▼ */}
                    {event.area && (
                      <span className="absolute bottom-2 left-2 bg-sky-100 text-sky-900 text-sm font-bold px-3 py-1.5 rounded shadow-sm border border-sky-200">
                        📍 {event.area}
                      </span>
                    )}
                    {/* ▲▲ ここまで ▲▲ */}

                  </div>

                  <div className="p-5"> {/* パディングを少し拡大 p-4 -> p-5 */}
                    {/* ▼▼ 日付：文字サイズ拡大 text-lg -> text-xl ▼▼ */}
                    <p className="text-blue-700 font-bold text-xl mb-2">
                      📅 {formatDate(event.event_date)}
                    </p>
                    
                    {/* タイトル */}
                    <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-3 line-clamp-2">
                      {event.title}
                    </h2>
                    
                    {/* ▼▼ 詳細情報：文字サイズ全体を拡大 text-sm -> text-base ▼▼ */}
                    <div className="text-gray-600 text-base space-y-3">
                      <p className="line-clamp-1 flex items-center gap-1">
                        <span>📍</span>
                        {event.location || '場所の記載なし'}
                      </p>
                      
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden flex-shrink-0 border border-slate-200"> {/* アイコンも少し拡大 */}
                          {posterIcon ? (
                            <img src={posterIcon} alt={posterName} className="w-full h-full object-cover" />
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
      </div>
    </main>
  );
}