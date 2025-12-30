'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    organization_name: '',
    email: '',
    activity_details: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('applications')
        .insert([formData]);

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setErrorMsg('送信に失敗しました。しばらく経ってからやり直してください。');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">申請を受け付けました</h2>
          <p className="text-gray-600 mb-6">
            管理者が内容を確認後、承認された場合はご入力いただいたメールアドレス宛に登録用リンクをお送りします。
          </p>
          <Link href="/" className="text-blue-600 hover:underline font-bold">
            トップページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">新規利用申請</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          イベント投稿をご希望の団体様は、以下のフォームより申請をお願いいたします。
        </p>

        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">団体名・活動名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="例：浜松自然を守る会"
              value={formData.organization_name}
              onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="contact@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">このアドレスに招待状が届きます。</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">活動内容・申請理由 <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="どのようなイベントを投稿予定か、簡単にご記入ください。"
              value={formData.activity_details}
              onChange={(e) => setFormData({ ...formData, activity_details: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '送信中...' : '申請する'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600 hover:underline">
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}