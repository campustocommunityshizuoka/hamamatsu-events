'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [name, setName] = useState('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);

  // 1. 現在のプロフィール情報を取得
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error(error);
      } else if (data) {
        setName(data.name || '');
        setCurrentAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  // 画像アップロード処理
  const uploadAvatar = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    // ファイル名を「ユーザーID-ランダム」にしてユニークにする
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // アップロード
    const { error: uploadError } = await supabase.storage
      .from('profile-images') // アイコン用のバケット
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // 公開URLを取得
    const { data } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // 2. 保存処理
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('名前は必須です');
      return;
    }
    setUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // 画像があればアップロードしてURLを取得
      let avatarUrl = currentAvatarUrl;
      if (newAvatarFile) {
        avatarUrl = await uploadAvatar(newAvatarFile);
      }

      // プロフィール更新
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('プロフィールを更新しました！');
      router.push('/admin'); // マイページへ戻る

    } catch (error) {
      console.error(error);
      alert('更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-10">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">プロフィールの編集</h1>
        
        <form onSubmit={handleSave} className="space-y-6">
          {/* アイコン設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">アイコン画像</label>
            <div className="flex items-center gap-6">
              {/* プレビュー表示 */}
              <div className="w-20 h-20 rounded-full bg-gray-200 border overflow-hidden flex-shrink-0">
                {newAvatarFile ? (
                  // 新しく選択した画像を表示
                  <img src={URL.createObjectURL(newAvatarFile)} className="w-full h-full object-cover" />
                ) : currentAvatarUrl ? (
                  // 現在の画像を表示
                  <img src={currentAvatarUrl} className="w-full h-full object-cover" />
                ) : (
                  // デフォルト
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Img</div>
                )}
              </div>
              
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setNewAvatarFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* 名前設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">団体名・表示名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="例：浜松老人会"
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
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-bold disabled:opacity-50"
            >
              {updating ? '保存中...' : '変更を保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}