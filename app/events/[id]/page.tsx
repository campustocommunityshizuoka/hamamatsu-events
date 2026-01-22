import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import AccessibilityMenu from '@/app/components/AccessibilityMenu';
import ViewCounter from '@/app/components/ViewCounter';
import ReportButton from '@/app/components/ReportButton';
import ImageCarousel from '@/app/components/ImageCarousel'; // ★追加

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
  additional_images: string[] | null; // ★追加
  tags: string[] | null;
  profiles: {
    name: string | null;
    avatar_url: string | null;
    website_url: string | null;
  } | null;
};

async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      profiles ( name, avatar_url, website_url )
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
  const posterUrl = event.profiles?.website_url;

  // 画像リストの作成（メイン画像 + 追加画像）
  const allImages = [
    event.image_url,
    ...(event.additional_images || [])
  ].filter((img): img is string => !!img);

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
        <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-600 py-2 px-4 border border-slate-300 rounded-full bg-white hover:bg-slate-50 transition-colors">
          ← もどる
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        
        {/* ★修正: 画像カルーセルコンポーネントを使用 */}
        <ImageCarousel images={allImages} alt={event.title} />

        <div className="p-6 space-y-8">
              {/* 主催者情報 & HPリンク */}
              <div className="flex items-center gap-4 border-b pb-6">
                  <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
                    {posterIcon ? (
                      <img src={posterIcon} alt={posterName} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-full h-full text-gray-500 p-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-0.5">投稿・主催</p>
                    <p className="text-lg font-bold text-gray-900 leading-tight">{posterName}</p>
                    
                    {posterUrl && (
                      <a 
                        href={posterUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline mt-1"
                      >
                        この団体のホームページはこちら
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
              </div>

              <div>
                {/* カテゴリ表示 */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {event.category && (
                    <span className="inline-block bg-teal-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                      {event.category}
                    </span>
                  )}
                </div>

                {/* タグ表示 */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {event.tags.map((tag, index) => (
                      <span key={index} className="text-sm font-bold text-gray-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <h1 className="text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
                  {event.title}
                </h1>
              </div>

              <div className="space-y-6 text-xl">
                <div>
                  <span className="text-gray-500 text-xs font-bold block mb-1">開催日</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    <span className="font-bold text-2xl text-gray-800">{formatDate(event.event_date)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <span className="text-gray-500 text-xs font-bold block mb-3">開催場所</span>
                  <div className="flex flex-col gap-4">
                    <div>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-2xl mt-0.5">📍</span>
                          <p className="font-bold text-2xl text-gray-800 leading-tight">{event.location || '未定'}</p>
                        </div>
                        
                        {event.location && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 ml-9"
                          >
                            Googleマップアプリで見る
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        )}
                    </div>

                    {event.location && (
                      <div className="w-full h-64 bg-gray-200 rounded-xl overflow-hidden border border-gray-300 shadow-sm relative">
                        <iframe
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                          title="Google Map"
                        ></iframe>
                      </div>
                    )}
                  </div>
                </div>

                {event.contact_phone && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <span className="text-blue-800 text-xs font-bold block mb-1">お問い合わせ電話番号</span>
                    <span className="font-bold text-2xl text-slate-800">{event.contact_phone}</span>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <span className="text-gray-500 text-xs font-bold block mb-4">イベント詳細</span>
                  <p className="whitespace-pre-wrap leading-loose text-base text-gray-700 font-medium">
                    {event.description}
                  </p>
                </div>

                {/* 通報ボタン */}
                <div className="mt-12 flex justify-center">
                  <ReportButton eventId={event.id} />
                </div>

              </div>
        </div>
      </div>
    </main>
  );
}