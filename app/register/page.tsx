'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ▼▼▼ ★追加機能: なりすまし防止用のID生成ロジック ▼▼▼
  const generateSearchId = (str: string) => {
    return str
      // 1. NFKC正規化（全角英数を半角に、などを統一）
      .normalize('NFKC')
      // 2. 小文字に統一（英語対策）
      .toLowerCase()
      // 3. スペース、タブ、アンダーバー、ハイフン、ドット、カンマを削除
      .replace(/[\s\t_.\-,]/g, '')
      // 4. 誤認しやすいカタカナを統一（簡易版）
      .replace(/ン/g, 'ソ')  // ン を ソ に変換して同一視
      .replace(/シ/g, 'ツ')  // シ を ツ に変換して同一視
      .replace(/口/g, 'ロ')  // 漢字の口(くち) を カタカナのロ に変換
      .replace(/ー/g, '-');  // 伸ばし棒もハイフン扱いで削除対象にしても良いが、ここでは統一
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // バリデーション
    if (!name.trim()) {
      setErrorMsg('名前を入力してください');
      setLoading(false);
      return;
    }

    try {
      // 1. 検索用ID（なりすまし判定用文字列）を生成
      const searchId = generateSearchId(name);

      if (searchId.length < 2) {
        setErrorMsg('有効な文字が少なすぎます。記号やスペースを除いて2文字以上にしてください。');
        setLoading(false);
        return;
      }

      // 2. 重複チェック（DBの関数を呼び出す）
      const { data: isExists, error: rpcError } = await supabase
        .rpc('check_search_id_exists', { target_id: searchId });

      if (rpcError) throw rpcError;

      if (isExists) {
        setErrorMsg('この名前（または酷似した名前）は既に使用されています。別の名前入力してください。');
        setLoading(false);
        return;
      }

      // 3. 登録処理（metadataに search_id を含める）
      const location = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name: name,          // 表示用の名前（そのまま）
            search_id: searchId  // 重複チェック用の名前（裏側で保存）
          },
          emailRedirectTo: `${location}/admin`,
        },
      });

      if (error) {
        setErrorMsg('登録に失敗しました: ' + error.message);
      } else {
        if (data.user) {
          alert('確認メールを送信しました。メール内のリンクをクリックするとマイページへ移動します。');
          router.push('/login'); // 新規登録後はログイン画面へ飛ばすのが一般的
        }
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg('システムエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">新規会員登録</h1>
        
        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm whitespace-pre-line">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">お名前（表示名）</label>
            <input
              type="text"
              required
              placeholder="例：浜松 太郎"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              ※スペースや記号の違いのみ、紛らわしい文字（ンとソなど）の違いのみの名前は登録できません。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">パスワード</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-2 flex items-center">
              <input
                id="show-password-reg"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="show-password-reg" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                パスワードを表示する
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">※6文字以上で入力してください</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-bold"
          >
            {loading ? 'チェック中...' : '登録する'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            すでにアカウントをお持ちの方はログインへ
          </Link>
        </div>
      </div>
    </div>
  );
}