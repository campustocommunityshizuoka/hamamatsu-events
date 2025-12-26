'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// イベント情報の型定義
type Event = {
  id: number;
  title: string;
  event_date: string;
  poster_id?: string;
  view_count?: number;
  is_hidden: boolean; // ★追加: 非表示フラグ
  profiles: {
    name: string | null;
  } | null;
};

// 自分のプロフィール情報の型
type MyProfile = {
  role: string;
  name: string | null;
  avatar_url: string | null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // 自分のプロフィール情報
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      // 1. ユーザー確認
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      setCurrentUserId(user.id);

      // 2. 自分のプロフィールを取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setMyProfile(profile);
      }
      
      const role = profile?.role || 'poster';
      const hasAdminPrivileges = ['admin', 'super_admin'].includes(role);

      // 3. イベントデータ取得
      let query = supabase
        .from('events')
        .select(`
          id, 
          title, 
          event_date, 
          poster_id,
          view_count,
          is_hidden, 
          profiles ( name )
        `) // ★ is_hidden を追加
        .order('event_date', { ascending: false });

      // 管理者権限がない場合は「自分の投稿」だけに絞り込む
      if (!hasAdminPrivileges) {
        query = query.eq('poster_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("データ取得エラー:", error);
      }

      if (data) {
        setEvents(data as unknown as Event[]);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [router]);

  // ▼▼▼ 削除処理（修正済み） ▼▼▼
  const handleDelete = async (id: number) => {
    if (!window.confirm('本当に削除してもよろしいですか？')) return;

    try {
      const { error, data } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error("削除エラー:", error);
        alert('削除処理中にエラーが発生しました。');
        return; 
      }

      if (!data || data.length === 0) {
        alert('削除できませんでした。\n権限が不足しているか、他の管理者の投稿である可能性があります。');
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== id));
      alert('削除しました');

    } catch (err) {
      console.error("予期せぬエラー:", err);
      alert('システムエラーが発生しました。');
    }
  };

  // ▼▼▼ ★追加機能: 非表示切り替え処理（super_admin用） ▼▼▼
  const handleToggleHidden = async (id: number, currentHiddenStatus: boolean) => {
    // 権限チェック（念のためフロントエンドでも確認）
    if (myProfile?.role !== 'super_admin') {
      alert('この操作は特権管理者のみ可能です。');
      return;
    }

    const newStatus = !currentHiddenStatus;
    const actionName = newStatus ? '非表示' : '再公開';

    if (!window.confirm(`この投稿を「${actionName}」にしますか？`)) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({ is_hidden: newStatus })
        .eq('id', id);

      if (error) {
        console.error("更新エラー:", error);
        alert(`${actionName}に設定できませんでした。`);
        return;
      }

      // 画面上の状態を更新
      setEvents((prev) => prev.map((e) => 
        e.id === id ? { ...e, is_hidden: newStatus } : e
      ));
      
    } catch (err) {
      console.error(err);
      alert('システムエラーが発生しました。');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const groupEventsByPoster = (targetEvents: Event[]) => {
    const grouped: Record<string, Event[]> = {};
    targetEvents.forEach((event) => {
      const posterName = event.profiles?.name || '不明な団体';
      if (!grouped[posterName]) {
        grouped[posterName] = [];
      }
      grouped[posterName].push(event);
    });
    return grouped;
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;

  const hasAdminPrivileges = ['admin', 'super_admin'].includes(myProfile?.role || '');
  const isSuperAdmin = myProfile?.role === 'super_admin'; // ★特権管理者フラグ

  const myEvents = hasAdminPrivileges ? events.filter(e => e.poster_id === currentUserId) : [];
  const otherEvents = hasAdminPrivileges ? events.filter(e => e.poster_id !== currentUserId) : [];
  const groupedOtherEvents = groupEventsByPoster(otherEvents);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="My Icon" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Img</div>
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">マイページ</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-600 font-medium">
                  {myProfile?.name || '名無し'} さん
                </p>
                {hasAdminPrivileges && (
                  <span className={`text-xs px-2 py-1 rounded ${myProfile?.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-600'}`}>
                    {myProfile?.role === 'super_admin' ? '特権管理者' : '全体管理者'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/admin/profile" 
              className="text-sm font-bold text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 bg-white"
            >
              ⚙ プロフィール設定
            </Link>
            
            <button onClick={handleLogout} className="text-sm text-red-600 underline ml-2">
              ログアウト
            </button>
          </div>
        </div>

        <div className="mb-6">
          <Link href="/admin/create" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-blue-700 inline-block">
            + 新しいイベントを作る
          </Link>
        </div>

        {/* リスト表示エリア */}
        {hasAdminPrivileges ? (
          <div className="space-y-10">
            {/* 自分の投稿 */}
            <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-blue-100">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-200">
                <h3 className="font-bold text-blue-800">📌 あなた（{myProfile?.role === 'super_admin' ? '特権管理者' : '全体管理者'}）の投稿</h3>
              </div>
              <EventTable 
                events={myEvents} 
                onDelete={handleDelete} 
                onToggleHidden={handleToggleHidden} // ★渡す
                isSuperAdmin={isSuperAdmin} // ★渡す
                emptyMessage="まだあなたの投稿はありません。" 
              />
            </div>

            {/* 他の団体の投稿 */}
            {Object.keys(groupedOtherEvents).length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-700 pl-2 border-l-4 border-gray-400">他の団体の投稿</h2>
                {Object.entries(groupedOtherEvents).map(([posterName, groupEvents]) => (
                  <div key={posterName} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                      <h3 className="font-bold text-gray-700">📂 {posterName}</h3>
                    </div>
                    <EventTable 
                      events={groupEvents} 
                      onDelete={handleDelete} 
                      onToggleHidden={handleToggleHidden} // ★渡す
                      isSuperAdmin={isSuperAdmin} // ★渡す
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <EventTable 
              events={events} 
              onDelete={handleDelete} 
              onToggleHidden={handleToggleHidden} 
              isSuperAdmin={isSuperAdmin} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

// テーブルコンポーネント
function EventTable({ 
  events, 
  onDelete, 
  onToggleHidden, 
  isSuperAdmin,
  emptyMessage = "投稿がありません" 
}: { 
  events: Event[], 
  onDelete: (id: number) => void, 
  onToggleHidden: (id: number, current: boolean) => void,
  isSuperAdmin: boolean,
  emptyMessage?: string 
}) {
  if (events.length === 0) {
    return <div className="p-6 text-center text-gray-500">{emptyMessage}</div>;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">開催日</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">イベント名</th>
          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">閲覧数</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {events.map((event) => (
          <tr key={event.id} className={event.is_hidden ? "bg-gray-100" : ""}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {event.event_date}
              {/* ★非表示バッジ */}
              {event.is_hidden && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white">
                  非表示中
                </span>
              )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              <Link href={`/admin/edit/${event.id}`} className={`hover:text-blue-600 hover:underline ${event.is_hidden ? 'text-gray-500' : ''}`}>
                {event.title}
              </Link>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-600">
              {event.view_count || 0}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              
              {/* ★super_admin専用の非表示ボタン */}
              {isSuperAdmin && (
                <button
                  onClick={() => onToggleHidden(event.id, event.is_hidden)}
                  className={`mr-4 font-bold ${
                    event.is_hidden 
                      ? 'text-blue-600 hover:text-blue-900' 
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                  title={event.is_hidden ? "公開する" : "非表示にする"}
                >
                  {event.is_hidden ? '公開する' : '非表示'}
                </button>
              )}

              <Link 
                href={`/admin/create?copy_from=${event.id}`} 
                className="text-teal-600 hover:text-teal-900 font-bold mr-4 inline-flex items-center gap-1"
                title="この内容をコピーして新規作成"
              >
                <span className="text-lg">📄</span> コピー
              </Link>

              <Link href={`/admin/edit/${event.id}`} className="text-indigo-600 hover:text-indigo-900 font-bold mr-4">
                編集
              </Link>
              <button onClick={() => onDelete(event.id)} className="text-red-600 hover:text-red-900">
                削除
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}