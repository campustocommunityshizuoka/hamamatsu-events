'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; 

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 入力項目のステート
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  
  // ★追加: 権限チェックとメッセージ送信用
  const [posterId, setPosterId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 画像関連
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  // 1. 画面表示時に既存データを取得
  useEffect(() => {
    const fetchEventAndProfile = async () => {
      if (!id) return;

      try {
        // A. ユーザー情報の取得
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          // プロフィールのロールを取得
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile) setMyRole(profile.role);
        }

        // B. イベント情報の取得
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setTitle(data.title || '');
          setArea(data.area || '');
          setDate(data.event_date || '');
          setLocation(data.location || '');
          setPhone(data.contact_phone || '');
          setDescription(data.description || '');
          setCurrentImageUrl(data.image_url);
          setPosterId(data.poster_id); // ★投稿者IDを保存
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
        alert('データの読み込みに失敗しました。一覧に戻ります。');
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndProfile();
  }, [id, router]);

  // 画像アップロード処理
  const uploadImage = async (file: File) => {
    try {
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
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      throw new Error('画像のアップロードに失敗しました');
    }
  };

  // 2. 更新ボタンが押された時の処理
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!title || !date || !area) {
      alert('活動名、地域、開催日は必須です');
      return;
    }

    if (!confirm('この内容で更新しますか？')) return;

    // ★追加: メッセージ送信用の理由入力ロジック
    let editReason = '';
    const isEditingOthersPost = posterId && posterId !== currentUserId;
    const hasAdminPrivileges = ['admin', 'super_admin'].includes(myRole || '');

    // 管理者が他人の投稿を編集する場合のみ理由を聞く
    if (hasAdminPrivileges && isEditingOthersPost) {
      const input = window.prompt('【管理者操作】編集の理由を入力してユーザーに通知しますか？\n(空欄のままOKを押すと通知を送らずに更新します)');
      // キャンセルボタンが押された場合は更新自体を中止
      if (input === null) return;
      editReason = input;
    }

    setUpdating(true);

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) throw new Error('ログインセッションが切れました。再ログインしてください。');

      // 画像処理
      let imageUrl = currentImageUrl;
      if (newImageFile) {
        imageUrl = await uploadImage(newImageFile);
      }

      // データベース更新 (Update)
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: title,
          area: area,
          event_date: date,
          location: location,
          contact_phone: phone,
          description: description,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('DB更新エラー詳細:', updateError);
        throw new Error(`データベースの更新に失敗しました: ${updateError.message}`);
      }

      // ★追加: メッセージ送信（理由がある場合のみ）
      if (editReason && posterId && currentUserId) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUserId,
            receiver_id: posterId,
            content: `【管理者通知】あなたの投稿「${title}」の内容が管理者により編集されました。\n\n理由: ${editReason}`
          });
        
        if (msgError) console.error("メッセージ送信エラー:", msgError);
        else alert("ユーザーに編集理由を通知しました。");
      }

      if (!editReason) alert('イベントを更新しました！');
      router.push('/admin');

    } catch (error: any) {
      console.error(error);
      alert(error.message || '更新中にエラーが発生しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">データを読み込んでいます...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-teal-800 text-center">投稿の編集</h1>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          
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
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 transition-colors"
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
            <label className="block text-sm font-bold text-gray-700 mb-1">活動の詳しい内容</label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* 画像選択 */}
          <div className="border-t pt-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">写真</label>
            
            {/* 現在の画像プレビュー */}
            {currentImageUrl && !newImageFile && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">現在登録されている写真:</p>
                <div className="w-40 h-32 bg-gray-100 border rounded overflow-hidden">
                  <img src={currentImageUrl} alt="現在の画像" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* 新しい画像プレビュー */}
            {newImageFile && (
              <div className="mb-4">
                <p className="text-xs text-teal-600 mb-1">新しくアップロードする写真:</p>
                <div className="w-40 h-32 bg-gray-100 border rounded overflow-hidden relative">
                   <img src={URL.createObjectURL(newImageFile)} alt="プレビュー" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-2">※写真を変更しない場合は、そのままでOKです</p>
          </div>

          {/* その他の詳細情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">詳しい場所（会場名など）</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">連絡先電話番号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              disabled={updating}
              className="w-full bg-teal-700 text-white py-3 px-4 rounded-md hover:bg-teal-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-md transition-all active:scale-[0.98]"
            >
              {updating ? '更新処理中...' : '変更を保存する'}
            </button>
            <Link href="/admin" className="text-center text-gray-500 hover:text-gray-700 underline text-sm">
              キャンセルして一覧に戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}