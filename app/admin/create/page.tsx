'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 入力項目のステート
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // 画像アップロード処理
  const uploadImage = async (file: File) => {
    // ファイル名をランダムにして重複を防ぐ
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // 公開URLを取得
    const { data } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      alert('タイトルと日付は必須です');
      return;
    }
    setLoading(true);

    try {
      // 1. ユーザー情報を取得（誰が投稿したか）
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしてください');

      // 2. 画像があればアップロード
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // 3. データベースに保存
      const { error } = await supabase
        .from('events')
        .insert({
          title: title,
          event_date: date,
          location: location,
          contact_phone: phone,
          description: description,
          image_url: imageUrl,
          poster_id: user.id, // 投稿者ID
        });

      if (error) throw error;

      alert('イベントを登録しました！');
      router.push('/admin'); // マイページに戻る

    } catch (error) {
      console.error(error);
      alert('登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">新しいイベントを作る</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 画像選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">写真（チラシなど）</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* イベント名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">イベント名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="例：秋のゲートボール大会"
            />
          </div>

          {/* 日付 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">開催日 <span className="text-red-500">*</span></label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* 場所 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">場所</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="例：浜松城公園"
            />
          </div>

          {/* 電話番号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">連絡先電話番号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="例：053-000-0000"
            />
          </div>

          {/* 詳細 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">くわしい内容</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="持ち物や注意事項など..."
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-4 pt-4">
            <Link href="/admin" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700">
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-bold disabled:opacity-50"
            >
              {loading ? '保存中...' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}