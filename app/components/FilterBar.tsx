'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLパラメータから現在の状態を取得
  const isRainOk = searchParams.get('rain') === 'true';
  const sortOrder = searchParams.get('sort') || 'date_asc'; // default: date_asc

  // パラメータを更新する関数
  const updateParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // ページ番号は1に戻す
    params.set('page', '1');
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-300 gap-4">
      
      {/* 雨でもOK スイッチ */}
      <div 
        className="flex items-center gap-4 cursor-pointer group"
        onClick={() => updateParams('rain', isRainOk ? null : 'true')}
      >
        <div className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${isRainOk ? 'bg-blue-500' : 'bg-slate-300'}`}>
          <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-300 ${isRainOk ? 'left-7' : 'left-1'}`}></div>
        </div>
        <span className={`text-base font-bold transition-colors ${isRainOk ? 'text-blue-700' : 'text-slate-700'}`}>
          雨でもOK
        </span>
      </div>

      {/* 並び替え プルダウン */}
      <div className="flex items-center gap-3">
        <label htmlFor="sort" className="text-sm font-bold text-slate-500 whitespace-nowrap">並び替え:</label>
        <div className="relative">
          <select
            id="sort"
            value={sortOrder}
            onChange={(e) => updateParams('sort', e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value="date_asc">📅 開催が早い順</option>
            <option value="newest">🆕 新着順</option>
          </select>
          {/* カスタム矢印アイコン */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

    </div>
  );
}