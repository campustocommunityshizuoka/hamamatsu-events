import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import AccessibilityMenu from '@/app/components/AccessibilityMenu';
import ViewCounter from '@/app/components/ViewCounter';
import ReportButton from '@/app/components/ReportButton'; 

export const runtime = 'edge';
export const revalidate = 0;

type Event = {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  category: string | null;
  contact_phone: string | null;
  image_url: string | null;
  profiles: {
    name: string | null;
    avatar_url: string | null;
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

  // 読み上げテキスト作成
  const spokenDate = new Date(event.event_date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const readingText = `
    イベント名、${event.title}。
    カテゴリ、${event.category || 'なし'}。
    開催日、${spokenDate}。
    場所、${event.location || '未定'}。
    内容は以下の通りです。${event.description || '詳細はありません'}。
    主催は、${posterName}です。
  `;

  return (
    <main className="min-h-screen bg-white pb-20 font-sans">
      
      {/* カウントアップ処理 */}
      <ViewCounter eventId={event.id} />
      
      {/* アクセシビリティメニュー */}
      <AccessibilityMenu textToRead={readingText} />

      <div className="p-4 bg-gray-100 border-b sticky top-0 z-10">
        <Link href="/" className="inline-flex items-center text-xl font-bold text-blue-700 py-2 px-4 border-2 border-blue-700 rounded-lg bg-white hover:bg-blue-50">
          ← もどる
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* 画像エリア */}
        <div className="w-full h-64 md:h-96 bg-gray-200">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-2xl">
              画像なし
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">
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

              <div>
                {/* カテゴリ表示 */}
                {event.category && (
                  <span className="inline-block bg-teal-100 text-teal-800 text-base font-bold px-4 py-1.5 rounded-full mb-2 border border-teal-200">
                    {event.category}
                  </span>
                )}
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  {event.title}
                </h1>
              </div>

              <div className="space-y-6 text-xl">
                <div>
                  <span className="text-gray-500 text-sm block">いつ</span>
                  <span className="font-bold text-2xl">{formatDate(event.event_date)}</span>
                </div>
                
                <div className="border-t border-b py-6 my-6">
                  <span className="text-gray-500 text-sm block mb-3">どこで</span>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <p className="font-bold text-2xl mb-2">{event.location}</p>
                        <a 
                          /* ▼▼ 修正箇所1: HTTPS化とURL修正 ▼▼ */
                          href={`https://maps.google.com/maps?q=${encodeURIComponent(event.location || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1 inline-block"
                        >
                          Googleマップアプリで見る
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    </div>

                    <div className="w-full md:w-1/2 h-64 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      {event.location ? (
                        <iframe
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          /* ▼▼ 修正箇所2: HTTPS化とURL修正 ▼▼ */
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                          title="Google Map"
                        ></iframe>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-base">
                          場所情報がありません
                        </div>
                      )}
                    </div>
                  </div>
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

                {/* 通報ボタン */}
                <div className="mt-8 flex justify-end">
                  <ReportButton eventId={event.id} />
                </div>

              </div>
        </div>
      </div>
    </main>
  );
}