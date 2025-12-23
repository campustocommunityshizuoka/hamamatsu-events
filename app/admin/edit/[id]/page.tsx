'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams(); // URLからIDを取得
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 入力項目のステート
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  
  // 画像関連
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  // 1. 画面表示時に既存データを取得
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        alert('データの読み込みに失敗しました');
        router.push('/admin');
        return;
      }

      if (data) {
        setTitle(data.title);
        setDate(data.event_date);
        setLocation(data.location || '');
        setPhone(data.contact_phone || '');
        setDescription(data.description || '');
        setCurrentImageUrl(data.image_url);
      }
      setLoading(false);
    };

    fetchEvent();
  }, [id, router]);

  // 画像アップロード処理（新規作成と同じ）
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // 2. 更新ボタンが押された時の処理
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      alert('タイトルと日付は必須です');
      return;
    }
    setUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインしてください');

      // 画像が新しく選ばれていればアップロード、なければ既存のまま
      let imageUrl = currentImageUrl;
      if (newImageFile) {
        imageUrl = await uploadImage(newImageFile);
      }

      // データベースを更新 (Update)
      const { error } = await supabase
        .from('events')
        .update({
          title: title,
          event_date: date,
          location: location,
          contact_phone: phone,
          description: description,
          image_url: imageUrl,
        })
        .eq('id', id); // IDが一致するものを更新

      if (error) throw error;

      alert('イベントを更新しました！');
      router.push('/admin');

    } catch (error) {
      console.error(error);
      alert('更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-10">データを読み込んでいます...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">イベントの編集</h1>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* 画像選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">写真</label>
            
            {/* 現在の画像プレビュー */}
            {currentImageUrl && !newImageFile && (
              <div className="mb-2 w-32 h-32 bg-gray-100 border">
                <img src={currentImageUrl} alt="現在の画像" className="w-full h-full object-cover" />
              </div>
            )}

            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">※変更しない場合はそのままでOKです</p>
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
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-4 pt-4">
            <Link href="/admin" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700">
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={updating}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-bold disabled:opacity-50"
            >
              {updating ? '更新中...' : '変更を保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}