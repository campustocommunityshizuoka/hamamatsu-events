'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// プロフィールの型定義
type Profile = {
  id: string;
  name: string | null;
  role: string;
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>('poster');

  // フォームの状態
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [messageContent, setMessageContent] = useState('');

  useEffect(() => {
    const init = async () => {
      // 1. ログインユーザー確認
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      // 2. 自分のロールを確認
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!myProfile) {
        router.push('/admin');
        return;
      }
      setMyRole(myProfile.role);

      const isAdmin = ['admin', 'super_admin'].includes(myProfile.role);

      // 3. 送信先候補を取得
      let query = supabase
        .from('profiles')
        .select('id, name, role')
        .order('role', { ascending: true })
        .order('name', { ascending: true });

      // ★重要: 一般ユーザーなら「管理者」だけを表示するように絞り込む
      if (!isAdmin) {
        query = query.in('role', ['admin', 'super_admin']);
      }

      const { data: targetProfiles, error } = await query;

      if (error) {
        console.error('ユーザー取得エラー:', error);
      } else if (targetProfiles) {
        // 自分自身はリストから除外
        setProfiles(targetProfiles.filter(p => p.id !== user.id));
      }
      
      setLoading(false);
    };

    init();
  }, [router]);

  // チェックボックスの切り替え
  const toggleUser = (id: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUserIds(newSelected);
  };

  // 全選択・全解除
  const toggleSelectAll = () => {
    if (selectedUserIds.size === profiles.length) {
      setSelectedUserIds(new Set()); // 全解除
    } else {
      setSelectedUserIds(new Set(profiles.map(p => p.id))); // 全選択
    }
  };

  // 送信処理
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUserIds.size === 0) {
      alert('送信先を選択してください。');
      return;
    }
    if (!messageContent.trim()) {
      alert('メッセージ本文を入力してください。');
      return;
    }

    if (!confirm(`${selectedUserIds.size} 名にメッセージを送信しますか？`)) return;

    setSending(true);

    try {
      // 送信データを作成
      const messagesToInsert = Array.from(selectedUserIds).map(receiverId => ({
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: messageContent.trim(),
        is_read: false
      }));

      const { error } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (error) throw error;

      alert('送信が完了しました！');
      setMessageContent('');
      setSelectedUserIds(new Set());
      router.push('/admin');

    } catch (error) {
      console.error('送信エラー:', error);
      alert('メッセージの送信に失敗しました。');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;

  const isAdmin = ['admin', 'super_admin'].includes(myRole);
  const pageTitle = isAdmin ? 'メッセージ一斉送信' : '管理者への連絡';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md border border-gray-100">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 underline">
            マイページに戻る
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左カラム：送信先選択 */}
          <div className="lg:col-span-1 border-r border-gray-200 pr-0 lg:pr-6">
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-gray-700">送信先を選択</label>
              <button 
                type="button" 
                onClick={toggleSelectAll}
                className="text-xs text-blue-600 hover:underline"
              >
                {selectedUserIds.size === profiles.length ? '全解除' : '全員選択'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              選択中: <span className="font-bold text-blue-600">{selectedUserIds.size}</span> / {profiles.length} 人
            </p>

            <div className="h-96 overflow-y-auto border border-gray-300 rounded-md bg-gray-50 p-2 space-y-1">
              {profiles.map(profile => (
                <label key={profile.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    checked={selectedUserIds.has(profile.id)}
                    onChange={() => toggleUser(profile.id)}
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{profile.name || '名無し'}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      profile.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      profile.role === 'admin' ? 'bg-red-100 text-red-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {profile.role}
                    </span>
                  </div>
                </label>
              ))}
              {profiles.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  送信可能な相手がいません
                </p>
              )}
            </div>
          </div>

          {/* 右カラム：メッセージ入力 */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSend} className="flex flex-col h-full">
              <label className="font-bold text-gray-700 mb-2">メッセージ内容</label>
              <div className="flex-grow">
                <textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                  placeholder={isAdmin ? "ここにメッセージを入力してください..." : "管理者への連絡事項、質問などを入力してください..."}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                />
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={sending || selectedUserIds.size === 0}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    '送信中...'
                  ) : (
                    <>
                      <span>📩</span> 送信する
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ※送信したメッセージは相手のマイページに即座に表示されます。
                </p>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}