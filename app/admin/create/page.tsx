'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

// 設定: 1日あたりの投稿上限数
const EVENT_POST_LIMIT = 5;

// カテゴリの選択肢
const CATEGORY_OPTIONS = [
  "お祭り・マルシェ",
  "音楽・ライブ",
  "スポーツ・運動",
  "学び・講座",
  "ボランティア",
  "子育て・子供向け",
  "展示・芸術",
  "その他"
];

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
  const [isPreview, setIsPreview] = useState(false); 

  const [remainingPosts, setRemainingPosts] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [area, setArea] = useState(''); 
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setMonth(maxDateObj.getMonth() + 1);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  useEffect(() => {
    const checkLimit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = profile?.role || 'poster';
      setUserRole(role);
      const adminFlag = ['admin', 'super_admin'].includes(role);
      setIsAdmin(adminFlag);

      if (!adminFlag) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('poster_id', user.id)
          .gte('created_at', yesterday);

        // error変数を明示的にチェックに使用して "unused" エラーを防ぐ
        if (!error && count !== null) {
          setRemainingPosts(Math.max(0, EVENT_POST_LIMIT - count));
        } else if (error) {
          console.error("投稿数カウントエラー:", error);
        }
      }
    };
    checkLimit();
  }, []);

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
        setCategory(data.category || '');
        setArea(data.area || '');
        setLocation(data.location || '');
        setPhone(data.contact_phone || '');
        setDescription(data.description || '');
      }
    };
    fetchSourceEvent();
  }, [copyFromId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewImageUrl(objectUrl);
    }
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !date || !area || !category) {
      alert('イベント名、カテゴリ、地域、開催日は必須です');
      return;
    }

    if (!imageFile && !copyFromId) {
        if(!imageFile) {
            alert('写真を選択してください');
            return;
        }
    }

    const isSuperAdmin = userRole === 'super_admin';
    if (!isSuperAdmin) {
      if (date < todayStr) {
        alert('過去の日付は設定できません');
        return;
      }
      if (date > maxDateStr) {
        alert('開催日は本日より1ヶ月以内で設定してください');
        return;
      }
    }

    if (!isAdmin && remainingPosts !== null && remainingPosts <= 0) {
      alert(`本日の投稿上限（${EVENT_POST_LIMIT}件）に達しています。`);
      return;
    }

    setIsPreview(true);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしてください');

      let imageUrl = null;
      if (imageFile) {
        const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.7 };
        const compressedFile = await imageCompression(imageFile, options);
        
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);
        
        imageUrl = data.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          title,
          category,
          area,
          event_date: date,
          location,
          contact_phone: phone,
          description,
          image_url: imageUrl,
          poster_id: user.id,
        });

      if (insertError) throw insertError;

      alert('イベントを公開しました！');
      router.push('/admin');

    } catch (error: unknown) { // ★修正: unknown型にして型安全にする
      console.error(error);
      let message = '登録に失敗しました';
      if (error instanceof Error) {
        message = error.message;
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = !isAdmin && remainingPosts !== null && remainingPosts <= 0;
  const isSuperAdmin = userRole === 'super_admin';

  if (isPreview) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden border border-teal-100">
          <div className="bg-teal-50 p-4 border-b border-teal-100 text-center">
            <h2 className="text-xl font-bold text-teal-800">プレビュー確認</h2>
            <p className="text-sm text-teal-600">実際の表示イメージです。この内容で公開しますか？</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative">
              {previewImageUrl ? (
                <img src={previewImageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-400">No Image</div>
              )}
              <span className="absolute top-2 left-2 bg-white/90 text-teal-800 text-xs font-bold px-2 py-1 rounded shadow">
                {category}
              </span>
              <span className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                {area}
              </span>
            </div>

            <div>
              <p className="text-gray-500 text-sm mb-1">{date.replaceAll('-', '/')}</p>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <p><strong>📍 場所:</strong> {location || '詳細なし'}</p>
                <p><strong>📞 連絡先:</strong> {phone || '詳細なし'}</p>
              </div>

              <div className="mt-6 whitespace-pre-wrap text-gray-700 leading-relaxed">
                {description}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex flex-col md:flex-row gap-4">
             <button
              onClick={() => setIsPreview(false)}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-100 transition"
             >
               修正する
             </button>
             <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-teal-800 text-white py-3 rounded-lg font-bold hover:bg-teal-900 transition shadow-md"
             >
               {loading ? '送信中...' : '公開する'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-teal-800 text-center">
          {copyFromId ? '過去の投稿から作成' : '新規投稿'}
        </h1>
        
        {!isAdmin && remainingPosts !== null && (
          <div className={`mb-6 p-4 rounded-md text-sm border ${
            remainingPosts > 0 ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800 font-bold'
          }`}>
            {remainingPosts > 0 ? (
               <>本日あと <span className="font-bold text-lg">{remainingPosts}</span> 件投稿できます。</>
            ) : (
               <>⚠️ 本日の投稿上限に達しました。</>
            )}
          </div>
        )}
        
        {isSuperAdmin && (
           <div className="mb-6 bg-purple-50 text-purple-800 p-4 rounded-md text-sm border border-purple-200 font-bold">
             ⚡ 特権管理者モード: 日付制限が無効化されています。
           </div>
        )}

        <form onSubmit={handlePreview} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              活動名 <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md" disabled={isLimitReached} />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              カテゴリ <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <select required value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md bg-white" disabled={isLimitReached}>
              <option value="">選択してください</option>
              {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              地域 <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <select required value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md bg-white" disabled={isLimitReached}>
              <option value="">選択してください</option>
              {AREA_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              開催日 {isSuperAdmin ? '(制限なし)' : '(1ヶ月先まで)'} <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <input type="date" required min={isSuperAdmin ? undefined : todayStr} max={isSuperAdmin ? undefined : maxDateStr} value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 block w-full p-3 border rounded-md ${isSuperAdmin ? 'border-purple-300 bg-purple-50' : 'border-gray-300'}`} disabled={isLimitReached} />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">活動の詳しい内容...</label>
            <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md" disabled={isLimitReached} />
          </div>

          <div className="border-t pt-6 border-dashed border-gray-300">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
              写真 <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded ml-2">必須</span>
            </label>
            <div className="flex justify-center">
              <label className={`cursor-pointer text-white font-bold py-3 px-8 rounded-full shadow-md flex items-center gap-2 ${isLimitReached ? 'bg-gray-400' : 'bg-orange-400 hover:bg-orange-500'}`}>
                <span>📷 写真を選択する</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" disabled={isLimitReached} />
              </label>
            </div>
            {imageFile && <p className="text-center text-sm text-gray-600 mt-2">選択中: {imageFile.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">詳しい場所</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" disabled={isLimitReached} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" disabled={isLimitReached} />
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button type="submit" disabled={loading || isLimitReached} className="w-full bg-teal-800 text-white py-3 px-4 rounded-md hover:bg-teal-900 font-bold shadow-lg">
              確認画面へ進む
            </button>
            <Link href="/admin" className="text-center text-gray-500 hover:text-gray-700 underline">キャンセル</Link>
          </div>
          
          <div className="pt-8 border-t mt-8 text-center text-xs text-gray-500">
             投稿することで、<Link href="/terms" target="_blank" className="text-blue-600 underline">利用規約</Link>および<Link href="/privacy" target="_blank" className="text-blue-600 underline">プライバシーポリシー</Link>に同意したものとみなされます。
          </div>
        </form>
      </div>
    </div>
  );
}