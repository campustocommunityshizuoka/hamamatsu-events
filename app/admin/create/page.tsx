'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// 地域の選択肢
const AREA_OPTIONS = [
  "中央区（旧中区）",
  "中央区（旧東区）",
  "中央区（旧西区）",
  "中央区（旧南区）",
  "中央区（旧北区・三方原）",
  "浜名区（旧浜北区）",
  "浜名区（旧北区）",
  "天竜区（旧天竜区）"
];

// メインコンポーネント（Suspenseでラップする）
export default function CreateEventPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">読み込み中...</div>}>
      <CreateEventForm />
    </Suspense>
  );
}

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copy_from'); // コピー元のIDを取得

  const [loading, setLoading] = useState(false);

  // 入力項目のステート
  const [title, setTitle] = useState('');
  const [area, setArea] = useState(''); 
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // ▼▼▼ コピー機能の追加 ▼▼▼
  useEffect(() => {
    if (!copyFromId) return;

    const fetchSourceEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', copyFromId)
        .single();

      if (error) {
        console.error('コピー元の取得に失敗', error);
        return;
      }

      if (data) {
        setTitle(data.title);
        setArea(data.area || '');
        setLocation(data.location || '');
        setPhone(data.contact_phone || '');
        setDescription(data.description || '');
        // 日付と画像は新規設定させるため、あえてコピーしません
        // (必要であれば setDate(data.event_date) を追加してください)
        
        // ユーザーに通知（任意）
        // alert('過去のイベント内容をコピーしました。\n日付と写真を設定してください。');
      }
    };

    fetchSourceEvent();
  }, [copyFromId]);
  // ▲▲▲ ここまで ▲▲▲

  // 画像アップロード処理
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!title || !date || !area) {
      alert('イベント名、地域、開催日は必須です');
      return;
    }

    setLoading(true);

    try {
      // 1. ユーザー情報を取得
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
          area: area,
          event_date: date,
          location: location,
          contact_phone: phone,
          description: description,
          image_url: imageUrl,
          poster_id: user.id,
        });

      if (error) throw error;

      alert('イベントを登録しました！');
      router.push('/admin');

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
        <h1 className="text-2xl font-bold mb-6 text-teal-800 text-center">
          {copyFromId ? '過去の投稿から作成' : '新規投稿'}
        </h1>
        
        {copyFromId && (
          <div className="mb-6 bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
            💡 過去のイベント内容をコピーしました。日付と写真を新しく設定してください。
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* イベント名 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              活動名
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              placeholder="例：ゲートボール大会"
            />
          </div>

          {/* 地域（プルダウン） */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              地域
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <select
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">選択してください</option>
              {AREA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* 日付 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              開催日
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* くわしい内容 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">活動の詳しい内容...</label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              placeholder="持ち物や注意事項など..."
            />
          </div>

          {/* 画像選択 */}
          <div className="border-t pt-6 border-dashed border-gray-300">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
              写真
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <div className="flex justify-center">
              <label className="cursor-pointer bg-orange-400 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-md transition-colors flex items-center gap-2">
                <span>📷 写真を選択する</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
            {imageFile && (
              <p className="text-center text-sm text-gray-600 mt-2">
                選択中: {imageFile.name}
              </p>
            )}
          </div>

          {/* その他の詳細情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">詳しい場所（会場名など）</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="例：浜松城公園"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">連絡先電話番号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="例：053-000-0000"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-800 text-white py-3 px-4 rounded-md hover:bg-teal-900 font-bold disabled:opacity-50 text-lg shadow-lg"
            >
              {loading ? '送信中...' : 'この内容で公開する'}
            </button>
            <Link href="/admin" className="text-center text-gray-500 hover:text-gray-700 underline">
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}