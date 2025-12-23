'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 追加
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('無効なリンクか、期限切れです。もう一度最初からやり直してください。');
        router.push('/forgot-password');
      }
    };
    checkSession();
  }, [router]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setErrorMsg('更新に失敗しました: ' + error.message);
      setLoading(false);
    } else {
      alert('パスワードを変更しました！');
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">新しいパスワードの設定</h1>

        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">新しいパスワード</label>
            <input
              type={showPassword ? 'text' : 'password'} // 切り替え
              required
              minLength={6}
              placeholder="6文字以上"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* ▼▼ パスワード表示チェックボックス ▼▼ */}
            <div className="mt-2 flex items-center">
              <input
                id="show-password-upd"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="show-password-upd" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                パスワードを表示する
              </label>
            </div>
            {/* ▲▲ ここまで ▲▲ */}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-bold"
          >
            {loading ? '更新中...' : 'パスワードを変更する'}
          </button>
        </form>
      </div>
    </div>
  );
}