'use client';

type Props = {
  title: string;
  eventId: number;
  className?: string; // デザイン調整用
};

export default function ShareToLine({ title, eventId, className = "" }: Props) {
  
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault(); // 親リンクへの遷移を防ぐ
    e.stopPropagation(); // イベントのバブリングを防ぐ

    // 現在のサイトのドメインを取得（例: https://hamamatsu-events...）
    const origin = window.location.origin;
    const url = `${origin}/events/${eventId}`;
    
    // LINEに送るメッセージを作成
    const text = `【浜松イベント情報】\n${title}\n${url}`;
    
    // LINEのシェア用URLを開く
    window.open(
      `https://line.me/R/msg/text/?${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  return (
    <button
      onClick={handleShare}
      className={`
        flex items-center gap-1 bg-[#06C755] text-white font-bold rounded-full 
        transition-opacity hover:opacity-80
        ${className}
      `}
      title="LINEで教える"
    >
      {/* LINEのアイコンSVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
        <path d="M20.6 10c0-4.6-4.3-8.4-9.6-8.4S1.4 5.4 1.4 10c0 4.2 3.7 7.7 8.5 8.3.3 0 .7.1.8.3.1.2.1.5 0 .8-.1.4-.6 1.6-.7 1.9-.2.8-1 2.3.9 1.3l5.5-3.6c.3-.2.7-.2 1-.1 2.6.7 5.2-.2 5.2-4.9z"/>
      </svg>
      <span className="text-xs md:text-sm">LINEで送る</span>
    </button>
  );
}