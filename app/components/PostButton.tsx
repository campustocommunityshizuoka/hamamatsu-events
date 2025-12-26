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
      router.push('/admin/create');
    } else {
      // 未ログインならログイン画面へ
      router.push('/login');
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="bg-white text-orange-600 font-bold py-2 px-4 rounded-full shadow hover:bg-orange-50 transition duration-200 flex items-center gap-2 text-sm"
    >
      <span className="text-lg">✏️</span>
      投稿する
    </button>
  );
}