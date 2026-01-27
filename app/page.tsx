import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import EventList from '@/app/components/EventList';
import Maintenance from '@/app/components/Maintenance';
import FilterBar from '@/app/components/FilterBar'; // 追加

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const PER_PAGE = 10;

// ▼▼ 定数定義（検索用） ▼▼
const CATEGORY_OPTIONS = [
  "お祭り・マルシェ",
  "音楽・ライブ",
  "スポーツ・運動",
  "学び・講座",
  "ボランティア",
  "子育て・子供向け",
  "展示・芸術",
  "その他"
];

const AREA_OPTIONS = [
  "中央区（旧中区）",
  "中央区（旧東区）",
  "中央区（旧西区）",
  "中央区（旧南区）",
  "中央区（旧北区・三方原）",
  "浜名区（旧浜北区）",
  "浜名区（旧北区）",
  "天竜区（旧天竜区）"
];

type Event = {
  id: number;
  title: string;
  event_date: string;
  location: string | null;
  area: string | null;
  category: string | null;
  image_url: string | null;
  tags: string[] | null;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
};

type EventsResult = {
  events: Event[];
  total: number | null;
};

// 検索パラメータの型定義
type SearchParams = {
  page?: string;
  category?: string;
  area?: string;
  q?: string;
  rain?: string; // 追加: 雨でもOKフィルタ
  sort?: string; // 追加: 並び替え
};

async function checkMaintenance(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'maintenance_mode')
    .single();
  
  return data?.value === 'true';
}

// ▼▼ 検索ロジックを組み込んだデータ取得関数 ▼▼
async function getEvents(params: SearchParams): Promise<EventsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { events: [], total: 0 };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const page = params.page ? parseInt(params.page) : 1;
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const today = new Date().toISOString().split('T')[0];
  
  // ★変更箇所: 14日から30日（約1ヶ月）に変更
  const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  
  let query = supabase
    .from('events')
    .select(`
      id, title, event_date, location, area, category, image_url, tags, created_at,
      profiles ( name, avatar_url ) 
    `, { count: 'exact' })
    .eq('is_hidden', false) 
    .gte('event_date', today);

  // 1. カテゴリ検索
  if (params.category) {
    query = query.eq('category', params.category);
  }

  // 2. エリア検索
  if (params.area) {
    query = query.eq('area', params.area);
  }

  // 3. キーワード検索（タイトル OR タグ）
  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,tags.cs.{${params.q}}`);
  }

  // 4. 雨でもOK検索（タグに「雨でもOK」が含まれるか）
  if (params.rain === 'true') {
    // tags配列が '雨でもOK' を含んでいるか
    query = query.contains('tags', ['雨でもOK']);
  }

  // 検索条件がない場合のみ、デフォルトで「1ヶ月先まで」に絞る
  // (ただし、新着順で見たい場合などは期間制限を外す考え方もあるが、ここでは基本ルールに従う)
  if (!params.q && !params.category && !params.area && !params.rain && !params.sort) {
     // ★変更箇所: 変数名を oneMonthLater に変更
     query = query.lte('event_date', oneMonthLater);
  }

  // 5. 並び替え
  if (params.sort === 'newest') {
    // 新着順（作成日 降順）
    query = query.order('created_at', { ascending: false });
  } else {
    // 開催が早い順（開催日 昇順） -> デフォルト
    query = query.order('event_date', { ascending: true });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase Error:', error);
    return { events: [], total: 0 };
  }
  
  return { events: data as unknown as Event[], total: count };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const isMaintenance = await checkMaintenance(supabase);
  if (isMaintenance) {
    return <Maintenance />;
  }

  const resolvedSearchParams = await searchParams;
  
  // パラメータの整理
  const params: SearchParams = {
    page: typeof resolvedSearchParams.page === 'string' ? resolvedSearchParams.page : '1',
    category: typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined,
    area: typeof resolvedSearchParams.area === 'string' ? resolvedSearchParams.area : undefined,
    q: typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined,
    rain: typeof resolvedSearchParams.rain === 'string' ? resolvedSearchParams.rain : undefined,
    sort: typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : undefined,
  };
  
  const { events, total } = await getEvents(params);
  
  const totalEvents = total || 0;
  const currentPage = parseInt(params.page || '1');
  const totalPages = Math.ceil(totalEvents / PER_PAGE);
  const isSearching = !!(params.category || params.area || params.q || params.rain);

  return (
    <main className="min-h-screen bg-slate-100 font-sans flex flex-col text-slate-900">
      
      {/* ▼▼ ヘッダー ▼▼ */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 relative transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Hamamatsu<span className="text-blue-700">Events</span>
            </h1>
          </Link>
          
          <Link 
            href="/admin" 
            className="text-base font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors px-4 py-2 rounded hover:bg-blue-50"
          >
            イベント投稿
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
        </div>
      </header>

      {/* ▼▼ ヒーローセクション ▼▼ */}
      <div className="bg-blue-50 pb-16 pt-12 px-6 rounded-b-[3rem] shadow-sm mb-10 border-b border-blue-200">
        <div className="max-w-2xl mx-auto text-center">
          
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight animate-fade-in-up">
            今週末、<br/>
            <span className="text-blue-700">どこへ出かける？</span>
          </h2>
          <p className="text-base md:text-lg font-bold text-slate-700 mb-10 animate-fade-in-up animation-delay-200">
            浜松エリアのイベントを厳選してお届け
          </p>

          {/* 検索バー */}
          <form action="/" method="GET" className="relative mb-8 shadow-xl rounded-full group animate-fade-in-up animation-delay-400">
             {/* 既存フィルタ維持 */}
            {params.category && <input type="hidden" name="category" value={params.category} />}
            {params.area && <input type="hidden" name="area" value={params.area} />}
            {params.rain && <input type="hidden" name="rain" value={params.rain} />}

            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              name="q"
              defaultValue={params.q}
              placeholder="キーワード検索（例：祭り、無料）" 
              className="w-full py-5 pl-14 pr-6 rounded-full border-2 border-blue-100 focus:border-blue-600 focus:ring-0 text-lg font-bold placeholder-slate-400 text-slate-900 shadow-sm outline-none transition-colors"
            />
          </form>

          {/* カテゴリタグ */}
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up animation-delay-400">
             <Link 
              href="/" 
              className={`px-5 py-2 rounded-full text-sm font-bold shadow-md transition transform hover:-translate-y-0.5 ${
                !params.category 
                  ? 'bg-blue-700 text-white' 
                  : 'bg-white text-blue-800 border-2 border-blue-100 hover:bg-blue-50'
              }`}
            >
              すべて
            </Link>
            {CATEGORY_OPTIONS.map((cat) => (
              <Link
                key={cat}
                href={`/?${new URLSearchParams({
                  ...(params.q ? { q: params.q } : {}),
                  ...(params.area ? { area: params.area } : {}),
                  ...(params.rain ? { rain: params.rain } : {}),
                  ...(params.category === cat ? {} : { category: cat }),
                }).toString()}`}
                className={`px-5 py-2 rounded-full text-sm font-bold shadow-sm border-2 transition transform hover:-translate-y-0.5 ${
                  params.category === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-blue-800 border-blue-100 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* エリアタグ */}
          <div className="mt-6 animate-fade-in-up animation-delay-400">
            <p className="text-xs font-bold text-slate-500 mb-2">エリアで絞り込む</p>
            <div className="flex flex-wrap justify-center gap-2">
              {AREA_OPTIONS.map((areaName) => {
                const match = areaName.match(/（(.+)）/);
                const shortName = match ? match[1] : areaName;
                return (
                  <Link
                    key={areaName}
                    href={`/?${new URLSearchParams({
                      ...(params.q ? { q: params.q } : {}),
                      ...(params.category ? { category: params.category } : {}),
                      ...(params.rain ? { rain: params.rain } : {}),
                      ...(params.area === areaName ? {} : { area: areaName }),
                    }).toString()}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                      params.area === areaName
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-white text-slate-500 border-blue-50 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    {shortName}
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ▼▼ メインコンテンツ ▼▼ */}
      <div className="max-w-5xl mx-auto px-6 flex-grow w-full">
        
        {/* ★追加: フィルターバー（雨でもOK・並び替え） */}
        <FilterBar />

        {/* 検索結果・件数・クリアボタン */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-extrabold text-slate-900">
              {isSearching ? '検索結果' : 'おすすめイベント'}
            </h3>
            <span className="bg-blue-100 text-blue-800 text-sm font-black px-3 py-1 rounded-full border border-blue-200">{totalEvents}件</span>
          </div>
          
          {/* ★修正: 条件クリアボタン（わかりやすいボタンデザインに変更） */}
          {isSearching && (
             <Link 
               href="/" 
               className="flex items-center gap-2 bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 px-4 py-2 rounded-full text-xs font-bold transition-colors"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               条件をクリア
             </Link>
          )}
        </div>

        <EventList events={events} page={currentPage} totalPages={totalPages} />
      </div>

      {/* フッター */}
      <footer className="bg-white border-t border-slate-300 py-12 mt-20 text-base text-center">
        <div className="max-w-5xl mx-auto px-6">
          <p className="font-extrabold text-slate-900 text-xl mb-6">HamamatsuEvents</p>
          <div className="flex justify-center gap-8 mb-8">
            <Link href="/terms" className="text-slate-600 hover:text-blue-700 font-bold">利用規約</Link>
            <Link href="/privacy" className="text-slate-600 hover:text-blue-700 font-bold">プライバシーポリシー</Link>
            <a href="#" className="text-slate-600 hover:text-blue-700 font-bold">お問い合わせ</a>
          </div>
          <p className="text-slate-500 text-sm font-medium">© 2025 Hamamatsu Event Info</p>
        </div>
      </footer>
    </main>
  );
}