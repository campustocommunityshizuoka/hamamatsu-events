'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [mySearchId, setMySearchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('name, avatar_url, search_id, website_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error(error);
      } else if (data) {
        setName(data.name || '');
        setCurrentAvatarUrl(data.avatar_url);
        setMySearchId(data.search_id);
        setWebsiteUrl(data.website_url || '');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const getFilePathFromUrl = (url: string) => {
    try {
      const parts = url.split('/profile-images/');
      if (parts.length > 1) {
        return decodeURIComponent(parts[1]);
      }
      return null;
    } catch (e: unknown) {
      console.error('パス解析エラー', e);
      return null;
    }
  };

  // ▼▼▼ ★修正: ホワイトリスト方式による最強のID生成ロジック ▼▼▼
  const generateSearchId = (str: string) => {
    let processed = str.normalize('NFKC');

    // 1. 括弧以降を切り捨て
    processed = processed.replace(/[(\[{].*/, '');

    return processed
      // 2. 小文字に統一
      .toLowerCase()
      // 3. 【重要】文字（英数字・日本語）以外をすべて削除（ホワイトリスト方式）
      .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
      // 4. 誤認しやすい文字の統一
      .replace(/ン/g, 'ソ')
      .replace(/シ/g, 'ツ')
      .replace(/口/g, 'ロ')
      .replace(/ー/g, '-');
  };

  const uploadAvatar = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      console.log(`アイコン圧縮前: ${(file.size / 1024).toFixed(2)} KB`);

      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        initialQuality: 0.7,
      };

      const compressedFile = await imageCompression(file, options);
      console.log(`アイコン圧縮後: ${(compressedFile.size / 1024).toFixed(2)} KB`);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images') 
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      return data.publicUrl;

    } catch (error: unknown) {
      console.error('アイコン画像の処理エラー:', error);
      throw error;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('名前は必須です');
      return;
    }
    setUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const newSearchId = generateSearchId(name);

      if (newSearchId.length < 2) {
        alert('名前が短すぎます。記号や括弧内の補足を除いて2文字以上の名前にしてください。');
        setUpdating(false);
        return;
      }

      if (newSearchId !== mySearchId) {
        const { data: isExists, error: rpcError } = await supabase
          .rpc('check_search_id_exists', { target_id: newSearchId });

        if (rpcError) throw rpcError;

        if (isExists) {
          alert('この名前（または酷似した名前）は既に使用されています。\n別の名前を入力してください。');
          setUpdating(false);
          return;
        }
      }

      let avatarUrl = currentAvatarUrl;
      
      if (newAvatarFile) {
        avatarUrl = await uploadAvatar(newAvatarFile);

        if (currentAvatarUrl) {
          const oldFilePath = getFilePathFromUrl(currentAvatarUrl);
          if (oldFilePath) {
            const { error: deleteError } = await supabase.storage
              .from('profile-images')
              .remove([oldFilePath]);
            
            if (deleteError) {
              console.error('旧アイコン削除失敗:', deleteError);
            } else {
              console.log('旧アイコンを削除しました:', oldFilePath);
            }
          }
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: name,
          avatar_url: avatarUrl,
          search_id: newSearchId,
          website_url: websiteUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      setMySearchId(newSearchId);
      setCurrentAvatarUrl(avatarUrl); 
      setNewAvatarFile(null);

      alert('プロフィールを更新しました！');
      router.push('/admin');

    } catch (error: unknown) {
      console.error(error);
      alert('更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('【警告】本当にアカウントを削除しますか？\n\n投稿したイベント、メッセージ、画像など全てのデータが完全に削除され、復元することはできません。')) {
      return;
    }
    
    if (!window.confirm('本当によろしいですか？この操作は取り消せません。')) {
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase.rpc('delete_own_account');

      if (error) throw error;

      await supabase.auth.signOut();
      alert('アカウントを削除しました。ご利用ありがとうございました。');
      router.push('/');

    } catch (error: unknown) {
      console.error('削除エラー:', error);
      alert('アカウントの削除に失敗しました。時間をおいて再度お試しください。');
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
              <div className="w-20 h-20 rounded-full bg-gray-200 border overflow-hidden flex-shrink-0 relative">
                {newAvatarFile ? (
                  <img src={URL.createObjectURL(newAvatarFile)} className="w-full h-full object-cover" alt="New Avatar" />
                ) : currentAvatarUrl ? (
                  <img src={currentAvatarUrl} className="w-full h-full object-cover" alt="Current Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Img</div>
                )}
              </div>
              
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setNewAvatarFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
                />
                <p className="text-xs text-gray-400 mt-2">※画像は自動的に軽量化されます</p>
              </div>
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
            <p className="text-xs text-gray-400 mt-1">
              ※すでに存在する名前や、紛らわしい名前には変更できません。
            </p>
          </div>

          {/* HP URL設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              団体のホームページURL <span className="text-gray-400 font-normal text-xs">(任意)</span>
            </label>
            <input 
              type="url" 
              value={websiteUrl} 
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              イベント詳細ページにリンクが表示されます。SNSのURLでもOKです。
            </p>
          </div>

          {/* ボタン */}
          <div className="flex gap-4 pt-4 pb-8 border-b border-gray-200">
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

        {/* アカウント削除エリア */}
        <div className="mt-8 pt-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">アカウントの管理</h3>
          <p className="text-xs text-gray-500 mb-4">
            一度アカウントを削除すると、投稿したイベントやメッセージなど全てのデータが消去され、元に戻すことはできません。
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={updating}
            className="text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded text-sm font-bold w-full md:w-auto"
          >
            アカウントを削除する
          </button>
        </div>

      </div>
    </div>
  );
}