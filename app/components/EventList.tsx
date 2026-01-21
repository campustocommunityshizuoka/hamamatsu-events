'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, getDaysUntil } from '@/lib/utils';
import ShareToLine from '@/app/components/ShareToLine';

type Event = {
  id: number;
  title: string;
  event_date: string;
  location: string | null;
  area: string | null;
  category: string | null;
  image_url: string | null;
  // ▼▼▼ 追加: タグの型定義 ▼▼▼
  tags: string[] | null;
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

  const toggleKeep = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    let newIds;
    if (keptIds.includes(id)) {
      newIds = keptIds.filter(keepId => keepId !== id);
    } else {
      newIds = [...keptIds, id];
    }
    setKeptIds(newIds);
    localStorage.setItem('hamamatsu_event_keeps_v1', JSON.stringify(newIds));
  };

  const displayedEvents = showKeptOnly
    ? events.filter(event => keptIds.includes(event.id))
    : events;

  if (!isLoaded) return null;

  return (
    <div>
      {/* タブ切り替え */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-full shadow-sm border border-gray-200 inline-flex">
          <button
            onClick={() => setShowKeptOnly(false)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              !showKeptOnly ? 'bg-slate-700 text-white shadow' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            一覧
          </button>
          <button
            onClick={() => setShowKeptOnly(true)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${
              showKeptOnly ? 'bg-pink-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <span>♥</span> 気になる ({events.filter(e => keptIds.includes(e.id)).length})
          </button>
        </div>
      </div>

      {displayedEvents.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-lg text-gray-500">表示できるイベントがありません</p>
          {showKeptOnly && (
            <button onClick={() => setShowKeptOnly(false)} className="text-blue-600 underline mt-4 text-sm font-bold">
              すべてのイベントを見る
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
          const loadingType = index < 3 ? "eager" : "lazy";

          return (
            <Link key={event.id} href={`/events/${event.id}`} className="block group">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 h-full flex flex-col">
                
                {/* 1. 画像エリア (16:9 で横長対応) */}
                <div className="relative aspect-video bg-gray-100">
                  {event.image_url ? (
                    <img 
                      src={event.image_url} 
                      alt={event.title} 
                      loading={loadingType}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Image</div>
                  )}
                  
                  {/* === タグ配置エリア（分散させて重なり防止） === */}
                  
                  {/* 左上: カテゴリ */}
                  {event.category && (
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-teal-800 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border border-teal-100">
                      {event.category}
                    </span>
                  )}

                  {/* 右上: カウントダウン */}
                  {statusLabel && (
                    <span className="absolute top-3 right-3 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border-2 border-white">
                      {statusLabel}
                    </span>
                  )}

                  {/* 左下: エリア */}
                  {event.area && (
                    <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-slate-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border border-slate-100 flex items-center gap-1">
                      📍 {event.area}
                    </span>
                  )}
                </div>

                {/* 2. 情報エリア */}
                <div className="p-4 flex flex-col flex-grow">
                  
                  {/* 主催者アイコン */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-200">
                      {posterIcon ? (
                        <img src={posterIcon} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-300" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700 font-bold truncate">{posterName}</span>
                  </div>

                  {/* ▼▼▼ 追加: ハッシュタグ表示（タイトル上、灰色） ▼▼▼ */}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {event.tags.map((tag, idx) => (
                        <span key={idx} className="text-xs font-bold text-gray-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* タイトル */}
                  <h2 className="text-lg font-bold text-gray-900 leading-snug mb-3 line-clamp-2 group-hover:text-blue-800 transition-colors">
                    {event.title}
                  </h2>

                  {/* 日付と場所（見やすいアイコン付き） */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="text-xl text-blue-600">📅</span>
                      <span className="font-bold text-base">{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-xl text-red-500">📍</span>
                      <span className="text-sm truncate">{event.location || '場所の記載なし'}</span>
                    </div>
                  </div>

                  {/* 3. アクションボタン */}
                  <div className="mt-auto pt-3 border-t border-gray-100 flex justify-end gap-2">
                    <ShareToLine 
                      title={event.title} 
                      eventId={event.id} 
                      variant="modern" 
                    />
                    <button
                      onClick={(e) => toggleKeep(e, event.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors
                        ${isKept 
                          ? 'border-pink-500 bg-pink-50 text-pink-600' 
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                        }
                      `}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill={isKept ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        className="w-5 h-5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      <span className="text-xs font-bold">
                        {isKept ? '保存済' : '気になる'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ページネーション */}
      {!showKeptOnly && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-12 mb-8">
          {page > 1 ? (
            <Link 
              href={`/?page=${page - 1}`}
              className="px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-full font-bold shadow-sm hover:bg-slate-50 transition"
            >
              前へ
            </Link>
          ) : (
            <button disabled className="px-6 py-3 bg-gray-100 text-gray-400 border border-gray-200 rounded-full font-bold cursor-not-allowed">
              前へ
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
              次へ
            </Link>
          ) : (
            <button disabled className="px-6 py-3 bg-gray-100 text-gray-400 border border-gray-200 rounded-full font-bold cursor-not-allowed">
              次へ
            </button>
          )}
        </div>
      )}
    </div>
  );
}