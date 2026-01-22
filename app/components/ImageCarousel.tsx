'use client';

import { useState, useEffect, useRef } from 'react';

type Props = {
  images: string[];
  alt: string;
};

export default function ImageCarousel({ images, alt }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // 自動スクロール（10秒）
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const nextIndex = (activeIndex + 1) % images.length;
        const width = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({
          left: width * nextIndex,
          behavior: 'smooth',
        });
      }
    }, 10000); // 10秒

    return () => clearInterval(interval);
  }, [activeIndex, images.length]);

  // スクロール位置を検知してインジケーターを更新
  const handleScroll = () => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      // 現在のスクロール位置からインデックスを計算
      const index = Math.round(scrollRef.current.scrollLeft / width);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  };

  if (images.length === 0) {
    return (
      <div className="w-full h-64 md:h-96 bg-gray-200 flex items-center justify-center text-gray-400 text-2xl font-bold">
        No Image
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 md:h-96 bg-gray-200 group">
      {/* スクロールコンテナ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Firefox, IE用
      >
        {images.map((src, i) => (
          <div key={i} className="flex-shrink-0 w-full h-full snap-center">
            <img
              src={src}
              alt={`${alt} - 写真${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      
      {/* インジケーター（ドット） */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all shadow-sm ${
                i === activeIndex ? 'bg-white scale-125' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* 左右ナビゲーション（マウス操作用・ホバー時表示） */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (scrollRef.current) {
                const prev = activeIndex === 0 ? images.length - 1 : activeIndex - 1;
                scrollRef.current.scrollTo({ left: scrollRef.current.offsetWidth * prev, behavior: 'smooth' });
              }
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ←
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (scrollRef.current) {
                const next = (activeIndex + 1) % images.length;
                scrollRef.current.scrollTo({ left: scrollRef.current.offsetWidth * next, behavior: 'smooth' });
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            →
          </button>
        </>
      )}
      
      {/* Chrome/Safari用スクロールバー非表示スタイル */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}