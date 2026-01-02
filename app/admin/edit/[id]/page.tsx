'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

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

const IMAGE_UPDATE_LIMIT = 2;

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; 

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  
  const [posterId, setPosterId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [imageUpdateCount, setImageUpdateCount] = useState<number>(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchEventAndProfile = async () => {
      if (!id) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile) setMyRole(profile.role);
        }
        const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
        if (error) throw error;
        if (data) {
          setTitle(data.title || '');
          setCategory(data.category || '');
          setArea(data.area || '');
          setDate(data.event_date || '');
          setLocation(data.location || '');
          setPhone(data.contact_phone || '');
          setDescription(data.description || '');
          setCurrentImageUrl(data.image_url);
          setPosterId(data.poster_id);
          setImageUpdateCount(data.image_update_count || 0);
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    };
    fetchEventAndProfile();
  }, [id, router]);

  const getFilePathFromUrl = (url: string) => {
    try {
      const parts = url.split('/event-images/');
      if (parts.length > 1) {
        return decodeURIComponent(parts[1]);
      }
      return null;
    } catch (e) {
      console.error('パス解析エラー', e);
      return null;
    }
  };

  const uploadImage = async (file: File) => {
    try {
      console.log(`圧縮前: ${(file.size / 1024).toFixed(2)} KB`);
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.7 };
      const compressedFile = await imageCompression(file, options);
      console.log(`圧縮後: ${(compressedFile.size / 1024).toFixed(2)} KB`);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      throw new Error('画像の圧縮またはアップロードに失敗しました');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !area || !category) { alert('活動名、カテゴリ、地域、開催日は必須です'); return; }
    
    const hasAdminPrivileges = ['admin', 'super_admin'].includes(myRole || '');
    if (newImageFile && !hasAdminPrivileges && imageUpdateCount >= IMAGE_UPDATE_LIMIT) {
      alert(`このイベントの写真は既に${IMAGE_UPDATE_LIMIT}回変更されているため、これ以上変更できません。`);
      return;
    }
    if (!confirm('この内容で更新しますか？')) return;

    let editReason = '';
    const isEditingOthersPost = posterId && posterId !== currentUserId;
    if (hasAdminPrivileges && isEditingOthersPost) {
      const input = window.prompt('【管理者操作】編集理由を入力（空欄OK）');
      if (input === null) return;
      editReason = input;
    }

    setUpdating(true);

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      // authError変数を使用しないとエラーになるため、条件式に含める
      if (authError || !session) throw new Error('ログインセッションが切れました。');

      let imageUrl = currentImageUrl;
      let nextImageUpdateCount = imageUpdateCount;

      if (newImageFile) {
        imageUrl = await uploadImage(newImageFile);
        nextImageUpdateCount = imageUpdateCount + 1;

        if (currentImageUrl) {
          const oldFilePath = getFilePathFromUrl(currentImageUrl);
          if (oldFilePath) {
            const { error: deleteError } = await supabase.storage
              .from('event-images')
              .remove([oldFilePath]);
            
            // deleteError変数を使用
            if (deleteError) console.error('旧画像削除失敗:', deleteError);
          }
        }
      }

      const { error: updateError } = await supabase
        .from('events')
        .update({
          title, 
          category,
          area, 
          event_date: date, 
          location, 
          contact_phone: phone,
          description, 
          image_url: imageUrl, 
          image_update_count: nextImageUpdateCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      if (editReason && posterId && currentUserId) {
        await supabase.from('messages').insert({
            sender_id: currentUserId, receiver_id: posterId,
            content: `【管理者通知】あなたの投稿「${title}」が編集されました。\n理由: ${editReason}`
        });
      }

      if (!editReason) alert('イベントを更新しました！');
      router.push('/admin');

    } catch (error: unknown) { // ★修正: any型を避ける
      console.error(error);
      let message = '更新エラー';
      if (error instanceof Error) {
        message = error.message;
      }
      alert(message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">データを読み込んでいます...</div>;

  const isImageLocked = !['admin', 'super_admin'].includes(myRole || '') && imageUpdateCount >= IMAGE_UPDATE_LIMIT;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-teal-800 text-center">投稿の編集</h1>
        <form onSubmit={handleUpdate} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">活動名</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">カテゴリ</label>
            <select required value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm bg-white">
              <option value="">選択してください</option>
              {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">地域</label>
            <select required value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm bg-white">
              <option value="">選択してください</option>
              {AREA_OPTIONS.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">開催日</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">活動詳細</label>
            <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm" />
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">写真</label>
            {currentImageUrl && !newImageFile && (
              <div className="mb-4">
                <div className="w-40 h-32 bg-gray-100 border rounded overflow-hidden">
                  <img src={currentImageUrl} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            {newImageFile && (
              <div className="mb-4">
                <div className="w-40 h-32 bg-gray-100 border rounded overflow-hidden relative">
                   <img src={URL.createObjectURL(newImageFile)} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            {isImageLocked ? (
              <div className="bg-gray-100 p-4 rounded text-sm text-gray-500">🔒 変更回数上限です</div>
            ) : (
              <input type="file" accept="image/*" onChange={(e) => setNewImageFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="場所" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="電話番号" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button type="submit" disabled={updating} className="w-full bg-teal-700 text-white py-3 px-4 rounded-md font-bold disabled:opacity-50">{updating ? '更新中...' : '変更を保存する'}</button>
            <Link href="/admin" className="text-center text-gray-500 underline text-sm">キャンセル</Link>
          </div>
        </form>
      </div>
    </div>
  );
}