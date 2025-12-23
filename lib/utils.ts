// 日付を「12月25日 (水)」の形式に変換する関数
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  // 日本語の曜日
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];

  return `${month}月${day}日 (${dayOfWeek})`;
}

// 開催までの日数を計算して「明日」「今日」などを返す関数
export function getDaysUntil(dateString: string): string | null {
  const eventDate = new Date(dateString);
  const today = new Date();
  
  // 時間をリセットして日付だけで比較
  eventDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日開催！';
  if (diffDays === 1) return '明日開催';
  if (diffDays < 0) return '終了';
  
  return `あと${diffDays}日`;
}