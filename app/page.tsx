import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import EventList from '@/app/components/EventList';
import Maintenance from '@/app/components/Maintenance';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const PER_PAGE = 10;

type Event = {
  id: number;
  title: string;
  event_date: string;
  location: string | null;
  area: string | null;
  category: string | null;
  image_url: string | null;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
};

type EventsResult = {
  events: Event[];
  total: number | null;
};

// ★修正: any ではなく SupabaseClient 型を指定
async function checkMaintenance(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'maintenance_mode')
    .single();
  
  return data?.value === 'true';
}

async function getEvents(page: number): Promise<EventsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { events: [], total: 0 };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().split('T')[0];
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from('events')
    .select(`
      id, title, event_date, location, area, category, image_url,
      profiles ( name, avatar_url ) 
    `, { count: 'exact' })
    .eq('is_hidden', false) 
    .gte('event_date', today)
    .lte('event_date', twoWeeksLater)
    .order('event_date', { ascending: true })
    .range(from, to);

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
  // Supabaseクライアント作成とメンテナンスチェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const isMaintenance = await checkMaintenance(supabase);
  if (isMaintenance) {
    return <Maintenance />;
  }

  const resolvedSearchParams = await searchParams;
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  
  const { events, total } = await getEvents(page);
  
  const totalEvents = total || 0;
  const totalPages = Math.ceil(totalEvents / PER_PAGE);

  return (
    <main className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
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
        
        
        {/* ログインボタン */}
        <div>
          <Link 
            href="/login" 
            className="text-xs sm:text-sm font-medium bg-blue-800 hover:bg-blue-600 text-white px-3 py-2 rounded transition-colors border border-blue-600"
          >
            関係者ログイン
          </Link>
        </div>
      </header>
      

      <div className="max-w-md mx-auto md:max-w-4xl p-4 flex-grow w-full">
        {/* クライアントコンポーネントにデータを渡す */}
        <EventList events={events} page={page} totalPages={totalPages} />
      </div>

      {/* フッター */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-12 text-sm text-center">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-center items-center gap-6">
          <Link href="/terms" className="hover:text-white hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:text-white hover:underline">プライバシーポリシー</Link>
          <a 
            href="https://forms.google.com/your-form-url" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white hover:underline"
          >
            お問い合わせ
          </a>
        </div>
        <p className="mt-4 text-gray-500">© 2025 浜松イベント情報</p>
      </footer>

    </main>
  );
}