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

// スパム対策の設定
const SPAM_CONFIG = {
  DAILY_LIMIT: 10,      // 1日あたりの送信上限数
  COOLDOWN_MINUTES: 3,  // 連投防止の待機時間（分）
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>('poster');

  // ★追加: 残り送信可能回数
  const [remainingCount, setRemainingCount] = useState<number | null>(null);

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

      if (!isAdmin) {
        query = query.in('role', ['admin', 'super_admin']);
      }

      const { data: targetProfiles, error } = await query;

      if (error) {
        console.error('ユーザー取得エラー:', error);
      } else if (targetProfiles) {
        setProfiles(targetProfiles.filter(p => p.id !== user.id));
      }

      // 4. ★追加: 一般ユーザーの場合、残り送信回数を計算する
      if (!isAdmin) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', user.id)
          .gte('created_at', yesterday);

        if (!countError && count !== null) {
          // 上限から送信済み件数を引く（マイナスにならないように0で止める）
          const left = Math.max(0, SPAM_CONFIG.DAILY_LIMIT - count);
          setRemainingCount(left);
        }
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
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(profiles.map(p => p.id)));
    }
  };

  // スパムチェック処理
  const checkSpamLimits = async (userId: string) => {
    // 1. 連投チェック
    const { data: latestMsg, error: latestError } = await supabase
      .from('messages')
      .select('created_at')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestError && latestMsg) {
      const lastSentTime = new Date(latestMsg.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - lastSentTime) / (1000 * 60);

      if (diffMinutes < SPAM_CONFIG.COOLDOWN_MINUTES) {
        const waitTime = Math.ceil(SPAM_CONFIG.COOLDOWN_MINUTES - diffMinutes);
        throw new Error(`連投制限: メッセージを送信したばかりです。\nあと約 ${waitTime} 分お待ちください。`);
      }
    }

    // 2. 送信数チェック（Stateの値も確認）
    if (remainingCount !== null && remainingCount <= 0) {
      throw new Error(`送信制限: 本日の送信上限（${SPAM_CONFIG.DAILY_LIMIT}件）に達しています。`);
    }
    
    // 3. 今回送ろうとしている件数が残数を超えていないかチェック
    if (remainingCount !== null && selectedUserIds.size > remainingCount) {
       throw new Error(`送信制限: 残り ${remainingCount} 件までしか送信できません。\n送信先を減らしてください。`);
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
      const isAdmin = ['admin', 'super_admin'].includes(myRole);
      
      // 制限チェック
      if (!isAdmin && currentUserId) {
        await checkSpamLimits(currentUserId);
      }

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

      // ★追加: 送信成功時、残り回数を減らす（UIの即時反映）
      if (!isAdmin && remainingCount !== null) {
        setRemainingCount(Math.max(0, remainingCount - selectedUserIds.size));
      }

      alert('送信が完了しました！');
      setMessageContent('');
      setSelectedUserIds(new Set());
      
      // 管理者の場合は一覧へ、一般ユーザーの場合はそのまま（連続送信したい場合のため）
      if (isAdmin) {
        router.push('/admin');
      }

    } catch (error: any) {
      console.error('送信エラー:', error);
      alert(error.message || 'メッセージの送信に失敗しました。');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;

  const isAdmin = ['admin', 'super_admin'].includes(myRole);
  const pageTitle = isAdmin ? 'メッセージ一斉送信' : '管理者への連絡';

  // ★追加: 送信可能かどうかの判定フラグ
  const isLimitReached = !isAdmin && remainingCount !== null && remainingCount <= 0;

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
                disabled={isLimitReached} // 上限に達していたら選択不可
                className="text-xs text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {selectedUserIds.size === profiles.length ? '全解除' : '全員選択'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              選択中: <span className="font-bold text-blue-600">{selectedUserIds.size}</span> / {profiles.length} 人
            </p>

            <div className="h-96 overflow-y-auto border border-gray-300 rounded-md bg-gray-50 p-2 space-y-1">
              {profiles.map(profile => (
                <label key={profile.id} className={`flex items-center p-2 rounded transition-colors ${isLimitReached ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    checked={selectedUserIds.has(profile.id)}
                    onChange={() => toggleUser(profile.id)}
                    disabled={isLimitReached} // 上限に達していたら選択不可
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
              
              {/* ★修正: 残り回数の表示 */}
              {!isAdmin && remainingCount !== null && (
                <div className={`mb-3 p-3 rounded-md text-sm border ${
                  remainingCount > 0 
                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                    : 'bg-red-50 border-red-200 text-red-800 font-bold'
                }`}>
                  {remainingCount > 0 ? (
                    <>
                      <span>本日あと </span>
                      <span className="text-lg font-bold">{remainingCount}</span>
                      <span> 件送信できます。</span>
                    </>
                  ) : (
                    <span>⚠️ 本日の送信上限に達しました。明日またご利用ください。</span>
                  )}
                </div>
              )}

              <div className="flex-grow">
                <textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none text-base disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder={
                    isLimitReached 
                      ? "本日の送信上限に達しているため入力できません。" 
                      : (isAdmin ? "ここにメッセージを入力してください..." : "管理者への連絡事項、質問などを入力してください...")
                  }
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                  disabled={isLimitReached} // 上限に達していたら入力不可
                />
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  // 上限に達している、送信中、または選択人数が0なら無効化
                  disabled={sending || selectedUserIds.size === 0 || isLimitReached}
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