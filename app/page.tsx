import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { formatDate, getDaysUntil } from '@/lib/utils';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// 型定義に avatar_url を追加
type Event = {
  id: number;
  title: string;
  event_date: string;
  location: string | null;
  image_url: string | null;
  profiles: {
    name: string | null;
    avatar_url: string | null; // 追加
  } | null;
};

async function getEvents(): Promise<Event[]> {
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, event_date, location, image_url,
      profiles ( name, avatar_url ) 
    `) // avatar_url も一緒に取得
    .gte('event_date', today)
    .lte('event_date', twoWeeksLater)
    .order('event_date', { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return data as unknown as Event[];
}

export default async function Home() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-gray-100 pb-20 font-sans">
      <header className="bg-orange-500 text-white p-4 text-center shadow sticky top-0 z-20">
        <h1 className="text-2xl font-bold">浜松イベント情報</h1>
        <p className="text-xs mt-1 opacity-90">地域の催し物がすぐわかる</p>
      </header>

      <div className="max-w-md mx-auto md:max-w-4xl p-2">
        {events.length === 0 && (
          <div className="bg-white p-8 rounded-lg text-center mt-10 shadow-sm">
            <p className="text-xl text-gray-600 mb-2">現在、予定されている<br/>イベントはありません。</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {events.map((event) => {
            const statusLabel = getDaysUntil(event.event_date);
            const posterName = event.profiles?.name || '主催者不明';
            const posterIcon = event.profiles?.avatar_url; // アイコンURL
            
            return (
              <Link key={event.id} href={`/events/${event.id}`} className="block group">
                <div className="bg-white rounded-2xl shadow-md overflow-hidden transform transition duration-200 active:scale-95 border-b-4 border-gray-200">
                  
                  {/* 画像エリア */}
                  <div className="relative aspect-[4/3] bg-gray-200">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-lg font-bold">
                        画像なし
                      </div>
                    )}
                    
                    {statusLabel && (
                      <span className="absolute top-2 right-2 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow">
                        {statusLabel}
                      </span>
                    )}
                  </div>

                  {/* 情報エリア */}
                  <div className="p-4">
                    <p className="text-orange-600 font-bold text-lg mb-1">
                      📅 {formatDate(event.event_date)}
                    </p>
                    
                    <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-3">
                      {event.title}
                    </h2>
                    
                    <div className="text-gray-500 text-sm space-y-2">
                      <p>📍 {event.location || '場所の記載なし'}</p>
                      
                      {/* ▼▼ アイコンと団体名を表示 ▼▼ */}
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                        {/* アイコン画像（なければグレーの丸） */}
                        <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden flex-shrink-0 border border-gray-200">
                          {posterIcon ? (
                            <img src={posterIcon} alt={posterName} className="w-full h-full object-cover" />
                          ) : (
                            /* デフォルトアイコン（SVG） */
                            <svg className="w-full h-full text-gray-500 p-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          )}
                        </div>
                        <span className="font-bold text-gray-700">{posterName}</span>
                      </div>
                      {/* ▲▲ ここまで ▲▲ */}

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