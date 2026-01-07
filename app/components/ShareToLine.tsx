'use client';

type Props = {
  title: string;
  eventId: number;
  className?: string;
  variant?: 'primary' | 'modern'; // 'icon' を廃止し 'modern' に変更
};

export default function ShareToLine({ title, eventId, className = "", variant = 'primary' }: Props) {
  
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();

    const origin = window.location.origin;
    const url = `${origin}/events/${eventId}`;
    const text = `【浜松イベント情報】\n${title}\n${url}`;
    
    window.open(
      `https://line.me/R/msg/text/?${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  // ▼▼ 一覧画面用（モダンだけど分かりやすいデザイン） ▼▼
  if (variant === 'modern') {
    return (
      <button
        onClick={handleShare}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full
          border border-green-500 bg-green-50 text-green-700
          hover:bg-green-100 transition-colors
          ${className}
        `}
        title="LINEで教える"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
          <path d="M20.6 10c0-4.6-4.3-8.4-9.6-8.4S1.4 5.4 1.4 10c0 4.2 3.7 7.7 8.5 8.3.3 0 .7.1.8.3.1.2.1.5 0 .8-.1.4-.6 1.6-.7 1.9-.2.8-1 2.3.9 1.3l5.5-3.6c.3-.2.7-.2 1-.1 2.6.7 5.2-.2 5.2-4.9z"/>
        </svg>
        <span className="text-xs font-bold whitespace-nowrap">LINE</span>
      </button>
    );
  }

  // ▼▼ 詳細ページ用（今まで通りの目立つボタン） ▼▼
  return (
    <button
      onClick={handleShare}
      className={`
        flex items-center gap-1 bg-[#06C755] text-white font-bold rounded-full 
        transition-opacity hover:opacity-80 px-4 py-2 shadow-sm
        ${className}
      `}
      title="LINEで教える"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
        <path d="M20.6 10c0-4.6-4.3-8.4-9.6-8.4S1.4 5.4 1.4 10c0 4.2 3.7 7.7 8.5 8.3.3 0 .7.1.8.3.1.2.1.5 0 .8-.1.4-.6 1.6-.7 1.9-.2.8-1 2.3.9 1.3l5.5-3.6c.3-.2.7-.2 1-.1 2.6.7 5.2-.2 5.2-4.9z"/>
      </svg>
      <span className="text-sm">LINEで送る</span>
    </button>
  );
}