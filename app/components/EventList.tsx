'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, getDaysUntil } from '@/lib/utils';
import ShareToLine from '@/app/components/ShareToLine'; // ★追加: インポート

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

type Props = {
  events: Event[];
  page: number;
  totalPages: number;
};

export default function EventList({ events, page, totalPages }: Props) {
  const [keptIds, setKeptIds] = useState<number[]>([]);
  const [showKeptOnly, setShowKeptOnly] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初回ロード時にLocalStorageから読み込み
  useEffect(() => {
    const saved = localStorage.getItem('hamamatsu_event_keeps_v1');
    if (saved) {
      try {
        setKeptIds(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse keeps', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // キープ状態の切り替え
  const toggleKeep = (e: React.MouseEvent, id: number) => {
    e.preventDefault(); // リンク遷移を防ぐ
    
    let newIds;
    if (keptIds.includes(id)) {
      newIds = keptIds.filter(keepId => keepId !== id);
    } else {
      newIds = [...keptIds, id];
    }
    
    setKeptIds(newIds);
    localStorage.setItem('hamamatsu_event_keeps_v1', JSON.stringify(newIds));
  };

  // 表示するイベントのフィルタリング
  const displayedEvents = showKeptOnly
    ? events.filter(event => keptIds.includes(event.id))
    : events;

  // まだLocalStorage読み込み前ならレイアウトシフトを防ぐために何もしない
  if (!isLoaded) return null;

  return (
    <div>
      {/* ▼▼ 切り替えタブ ▼▼ */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-1 rounded-full shadow border border-slate-200 inline-flex">
          <button
            onClick={() => setShowKeptOnly(false)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              !showKeptOnly ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            すべてのイベント
          </button>
          <button
            onClick={() => setShowKeptOnly(true)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-1 ${
              showKeptOnly ? 'bg-pink-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span>♥</span> 気になる ({events.filter(e => keptIds.includes(e.id)).length})
          </button>
        </div>
      </div>

      {/* ▼▼ イベントなしの表示 ▼▼ */}
      {displayedEvents.length === 0 && (
        <div className="bg-white p-8 rounded-lg text-center mt-4 shadow-sm border border-slate-200">
          <p className="text-xl text-slate-600 mb-2">
            {showKeptOnly 
              ? '「気になる」イベントは、このページにはありません。' 
              : '現在、表示できるイベントはありません。'}
          </p>
          {showKeptOnly && (
            <button 
              onClick={() => setShowKeptOnly(false)}
              className="text-blue-600 hover:underline mt-4 font-bold"
            >
              すべてのイベントを表示する
            </button>
          )}
        </div>
      )}

      {/* ▼▼ リスト表示 ▼▼ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedEvents.map((event, index) => {
          const statusLabel = getDaysUntil(event.event_date);
          const posterName = event.profiles?.name || '主催者不明';
          const posterIcon = event.profiles?.avatar_url;
          const isKept = keptIds.includes(event.id);
          
          // 画像の読み込み優先度制御
          const loadingType = index < 3 ? "eager" : "lazy";

          return (
            <Link key={event.id} href={`/events/${event.id}`} className="block group relative">
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg overflow-hidden transform transition duration-200 active:scale-95 border-b-4 border-slate-200 h-full flex flex-col">
                
                {/* 画像エリア */}
                <div className="relative aspect-[4/3] bg-slate-100">
                  {event.image_url ? (
                    <img 
                      src={event.image_url} 
                      alt={event.title} 
                      loading={loadingType}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 text-lg font-bold">
                      No Image
                    </div>
                  )}
                  
                  {event.category && (
                    <span className="absolute top-2 left-2 bg-white/95 text-teal-900 text-sm font-bold px-3 py-1 rounded shadow border border-teal-100">
                      {event.category}
                    </span>
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

                {/* コンテンツエリア */}
                <div className="p-5 flex-grow">
                  {/* 日付とアクションボタンの行 */}
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-blue-700 font-bold text-xl">
                      📅 {formatDate(event.event_date)}
                    </p>
                    
                    {/* ★修正: ボタン配置エリア */}
                    <div className="flex gap-2 items-start -mt-1 -mr-1">
                      {/* LINEボタン */}
                      <ShareToLine 
                        title={event.title} 
                        eventId={event.id} 
                        className="px-2 py-1.5 shadow-sm bg-gray-50 border border-gray-200 !text-green-600 hover:bg-green-50"
                      />

                      {/* キープボタン */}
                      <button
                        onClick={(e) => toggleKeep(e, event.id)}
                        className={`
                          flex flex-col items-center justify-center p-2 rounded-lg transition-all
                          ${isKept ? 'text-pink-500 bg-pink-50' : 'text-slate-300 hover:text-pink-400 hover:bg-slate-50'}
                        `}
                        title={isKept ? "気になるリストから外す" : "気になるリストに追加"}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill={isKept ? "currentColor" : "none"} 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          className="w-8 h-8"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                        <span className="text-[10px] font-bold mt-0.5">
                          {isKept ? '登録済' : '気になる'}
                        </span>
                      </button>
                    </div>
                  </div>
                  
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

      {/* ページネーション（通常表示時のみ表示） */}
      {!showKeptOnly && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-12 mb-8">
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
    </div>
  );
}