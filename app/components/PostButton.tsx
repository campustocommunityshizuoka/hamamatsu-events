'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PostButton() {
  const router = useRouter();

  const handleClick = async () => {
    // セッション（ログイン状態）を確認
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // ログイン済みなら投稿画面へ
      router.push('/admin');
    } else {
      // 未ログインならログイン画面へ
      router.push('/login');
    }
  };

  return (
    <button 
      onClick={handleClick}
      // ▼▼ オレンジから青(text-blue-700)・空色ホバー(hover:bg-sky-50)に変更 ▼▼
      className="bg-white text-blue-700 font-bold py-2 px-5 rounded-full shadow hover:bg-sky-50 transition duration-200 flex items-center gap-2"
    >
      <span className="text-lg">✏️</span>
      {/* 文字サイズを少し大きく調整 */}
      <span className="text-base">投稿する</span>
    </button>
  );
}