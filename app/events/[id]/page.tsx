import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils'; // 作成したutilsを使用

export const runtime = 'edge';
export const revalidate = 0;

// 型定義
type Event = {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  contact_phone: string | null;
  image_url: string | null;
  profiles: {
    name: string | null;
    avatar_url: string | null; // 追加
  } | null;
};

async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      profiles ( name, avatar_url )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }
  return data as unknown as Event;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) return notFound();

  const posterName = event.profiles?.name || '主催者不明';
  const posterIcon = event.profiles?.avatar_url;

  return (
    <main className="min-h-screen bg-white pb-20 font-sans">
      <div className="p-4 bg-gray-100 border-b sticky top-0 z-10">
        <Link href="/" className="inline-flex items-center text-xl font-bold text-blue-700 py-2 px-4 border-2 border-blue-700 rounded-lg bg-white hover:bg-blue-50">
          ← もどる
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="w-full aspect-video bg-gray-200">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title} 
              className="w-full h-full object-contain" 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-2xl">
              画像なし
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">
          {/* ▼▼ 主催者情報の表示エリアを追加 ▼▼ */}
          <div className="flex items-center gap-3 border-b pb-4">
             <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
               {posterIcon ? (
                 <img src={posterIcon} alt={posterName} className="w-full h-full object-cover" />
               ) : (
                 <svg className="w-full h-full text-gray-500 p-2" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                 </svg>
               )}
             </div>
             <div>
               <p className="text-xs text-gray-500">投稿・主催</p>
               <p className="text-lg font-bold text-gray-800">{posterName}</p>
             </div>
          </div>
          {/* ▲▲ ここまで ▲▲ */}

          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            {event.title}
          </h1>

          <div className="space-y-6 text-xl">
            <div>
              <span className="text-gray-500 text-sm block">いつ</span>
              <span className="font-bold text-2xl">{formatDate(event.event_date)}</span>
            </div>
            
            <div>
              <span className="text-gray-500 text-sm block">どこで</span>
              <span className="font-bold text-2xl">{event.location}</span>
            </div>

            {event.contact_phone && (
              <div>
                <span className="text-gray-500 text-sm block">連絡先</span>
                <span className="font-bold text-2xl">{event.contact_phone}</span>
              </div>
            )}

            <div className="bg-orange-50 p-6 rounded-xl mt-4">
              <span className="text-gray-500 text-sm block mb-2">くわしい内容</span>
              <p className="whitespace-pre-wrap leading-relaxed text-lg">
                {event.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}