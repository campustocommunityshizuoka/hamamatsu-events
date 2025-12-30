'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

// ★設定: 1日あたりの投稿上限数
const EVENT_POST_LIMIT = 5;

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

// メインコンポーネント
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
  const copyFromId = searchParams.get('copy_from');

  const [loading, setLoading] = useState(false);

  // ★追加: 投稿制限管理用ステート
  const [remainingPosts, setRemainingPosts] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 入力項目のステート
  const [title, setTitle] = useState('');
  const [area, setArea] = useState(''); 
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // ★追加: 日付制限用の値を計算
  // 今日の日付 (YYYY-MM-DD形式)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 1ヶ月後の日付 (YYYY-MM-DD形式)
  const maxDateObj = new Date();
  maxDateObj.setMonth(maxDateObj.getMonth() + 1);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  // ★追加: ユーザー権限と本日の投稿数を確認する
  useEffect(() => {
    const checkLimit = async () => {
      // 1. ユーザー確認
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // ログインしていない場合は後続の処理で弾かれる

      // 2. 権限確認
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = profile?.role || 'poster';
      const adminFlag = ['admin', 'super_admin'].includes(role);
      setIsAdmin(adminFlag);

      // 3. 管理者でなければ、過去24時間の投稿数をカウント
      if (!adminFlag) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { count, error } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true }) // head:trueでデータの中身は取らず数だけ数える
          .eq('poster_id', user.id)
          .gte('created_at', yesterday);

        if (!error && count !== null) {
          const left = Math.max(0, EVENT_POST_LIMIT - count);
          setRemainingPosts(left);
        }
      }
    };

    checkLimit();
  }, []);

  // コピー機能
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
        // 日付はコピーせず、ユーザーに設定させるためセットしない
      }
    };

    fetchSourceEvent();
  }, [copyFromId]);

  // 画像圧縮＆アップロード処理
  const uploadImage = async (file: File) => {
    try {
      console.log(`圧縮前: ${(file.size / 1024).toFixed(2)} KB`);

      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.7,
      };

      const compressedFile = await imageCompression(file, options);
      console.log(`圧縮後: ${(compressedFile.size / 1024).toFixed(2)} KB`);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      return data.publicUrl;

    } catch (error) {
      console.error('画像処理エラー:', error);
      throw new Error('画像の圧縮またはアップロードに失敗しました');
    }
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション: 必須項目
    if (!title || !date || !area) {
      alert('イベント名、地域、開催日は必須です');
      return;
    }

    // ★追加: 日付の範囲バリデーション
    // 入力された日付と制限日を比較
    if (date < todayStr) {
      alert('過去の日付は設定できません');
      return;
    }
    if (date > maxDateStr) {
      alert('開催日は本日より1ヶ月以内で設定してください');
      return;
    }

    // ★追加: 投稿制限チェック
    if (!isAdmin && remainingPosts !== null && remainingPosts <= 0) {
      alert(`本日の投稿上限（${EVENT_POST_LIMIT}件）に達しています。\n明日また投稿してください。`);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしてください');

      // 画像があれば圧縮してアップロード
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // データベースに保存
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

  // 上限到達フラグ
  const isLimitReached = !isAdmin && remainingPosts !== null && remainingPosts <= 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-teal-800 text-center">
          {copyFromId ? '過去の投稿から作成' : '新規投稿'}
        </h1>
        
        {/* ★追加: 残り投稿可能数の表示 */}
        {!isAdmin && remainingPosts !== null && (
          <div className={`mb-6 p-4 rounded-md text-sm border ${
            remainingPosts > 0 
              ? 'bg-blue-50 border-blue-200 text-blue-800' 
              : 'bg-red-50 border-red-200 text-red-800 font-bold'
          }`}>
            {remainingPosts > 0 ? (
               <>本日あと <span className="font-bold text-lg">{remainingPosts}</span> 件投稿できます。</>
            ) : (
               <>⚠️ 本日の投稿上限（{EVENT_POST_LIMIT}件）に達しました。明日また投稿してください。</>
            )}
          </div>
        )}

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
              disabled={isLimitReached}
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
              disabled={isLimitReached}
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
              開催日 (1ヶ月先まで)
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <input
              type="date"
              required
              min={todayStr}    // ★追加: 過去の日付を選択不可に
              max={maxDateStr}  // ★追加: 1ヶ月後までを選択可能に
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              disabled={isLimitReached}
            />
            <p className="text-xs text-gray-500 mt-1">※本日から1ヶ月以内の日付を選択してください</p>
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
              disabled={isLimitReached}
            />
          </div>

          {/* 画像選択 */}
          <div className="border-t pt-6 border-dashed border-gray-300">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
              写真
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <div className="flex justify-center">
              <label className={`cursor-pointer text-white font-bold py-3 px-8 rounded-full shadow-md transition-colors flex items-center gap-2 ${isLimitReached ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-400 hover:bg-orange-500'}`}>
                <span>📷 写真を選択する</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={isLimitReached}
                />
              </label>
            </div>
            {imageFile && (
              <p className="text-center text-sm text-gray-600 mt-2">
                選択中: {imageFile.name}
              </p>
            )}
            <p className="text-center text-xs text-gray-400 mt-2">
              ※画像は自動的に軽量化されてアップロードされます
            </p>
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
                disabled={isLimitReached}
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
                disabled={isLimitReached}
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || isLimitReached}
              className="w-full bg-teal-800 text-white py-3 px-4 rounded-md hover:bg-teal-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
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