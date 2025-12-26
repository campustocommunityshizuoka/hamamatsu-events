'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

// イベント情報の型定義
type Event = {
  id: number;
  title: string;
  event_date: string;
  poster_id?: string;
  view_count?: number;
  is_hidden: boolean;
  profiles: {
    name: string | null;
  } | null;
};

// メッセージの型定義
type Message = {
  id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender: {
    name: string | null;
  } | null;
};

// 自分のプロフィール情報の型
type MyProfile = {
  id: string;
  role: string;
  name: string | null;
  avatar_url: string | null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  
  // メッセージパネルの開閉状態
  const [showMessages, setShowMessages] = useState(false);
  // パネル外クリック検知用のRef
  const messagePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
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
        .select('id, role, name, avatar_url')
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
        `)
        .order('event_date', { ascending: false });

      if (!hasAdminPrivileges) {
        query = query.eq('poster_id', user.id);
      }

      const { data: eventsData, error: eventsError } = await query;
      if (eventsError) console.error("データ取得エラー:", eventsError);
      if (eventsData) setEvents(eventsData as unknown as Event[]);

      // 4. メッセージ取得（★修正: 最新100件に制限して負荷対策）
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, is_read,
          sender:sender_id ( name )
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100); // ★ここを追加

      if (messagesError) console.error("メッセージ取得エラー:", messagesError);
      if (messagesData) setMessages(messagesData as unknown as Message[]);

      setLoading(false);
    };

    fetchData();
  }, [router]);

  // パネル外をクリックしたら閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (messagePanelRef.current && !messagePanelRef.current.contains(event.target as Node)) {
        setShowMessages(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // メッセージを既読にする処理
  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (err) {
      console.error("既読更新エラー:", err);
    }
  };

  // ★追加: メッセージを削除する処理
  const deleteMessage = async (messageId: string) => {
    if (!confirm('このメッセージを削除してもよろしいですか？')) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // 画面から消す
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
    } catch (err) {
      console.error("削除エラー:", err);
      alert('メッセージの削除に失敗しました。');
    }
  };

  const handleDelete = async (id: number, poster_id?: string, eventTitle?: string) => {
    if (!window.confirm('本当に削除してもよろしいですか？')) return;

    let deleteReason = '';
    const isDeletingOthersPost = poster_id && poster_id !== currentUserId;
    const hasAdminPrivileges = ['admin', 'super_admin'].includes(myProfile?.role || '');

    if (hasAdminPrivileges && isDeletingOthersPost) {
      const input = window.prompt('削除の理由を入力してユーザーに通知しますか？\n(空欄のままOKを押すと通知を送らずに削除します)');
      if (input === null) return;
      deleteReason = input;
    }

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
        alert('削除できませんでした。');
        return;
      }

      if (deleteReason && poster_id && currentUserId) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUserId,
            receiver_id: poster_id,
            content: `【重要】あなたの投稿「${eventTitle || '不明なイベント'}」は管理者により削除されました。\n\n理由: ${deleteReason}`
          });
        
        if (msgError) console.error("メッセージ送信エラー:", msgError);
        else alert("ユーザーに削除理由を通知しました。");
      }

      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (!deleteReason) alert('削除しました');

    } catch (err) {
      console.error("予期せぬエラー:", err);
      alert('システムエラーが発生しました。');
    }
  };

  // 非表示切り替え処理
  const handleToggleHidden = async (id: number, currentHiddenStatus: boolean, poster_id?: string, eventTitle?: string) => {
    if (myProfile?.role !== 'super_admin') {
      alert('この操作は特権管理者のみ可能です。');
      return;
    }

    const newStatus = !currentHiddenStatus;
    const actionName = newStatus ? '非表示' : '再公開';

    if (!window.confirm(`この投稿を「${actionName}」にしますか？`)) return;

    let hideReason = '';
    const isOthersPost = poster_id && poster_id !== currentUserId;
    
    if (newStatus === true && isOthersPost) {
       const input = window.prompt(`非表示にする理由を入力してユーザーに通知しますか？\n(空欄のままだと通知を送らずに非表示にします)`);
       if (input === null) return;
       hideReason = input;
    }

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

      if (hideReason && poster_id && currentUserId) {
         const { error: msgError } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUserId,
            receiver_id: poster_id,
            content: `【管理者通知】あなたの投稿「${eventTitle || '不明なイベント'}」は管理者により非表示に設定されました。\n\n理由: ${hideReason}`
          });
         if (msgError) console.error(msgError);
         else alert("ユーザーに理由を通知しました。");
      }

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
  const isSuperAdmin = myProfile?.role === 'super_admin';
  const unreadCount = messages.filter(m => !m.is_read).length;

  const myEvents = hasAdminPrivileges ? events.filter(e => e.poster_id === currentUserId) : [];
  const otherEvents = hasAdminPrivileges ? events.filter(e => e.poster_id !== currentUserId) : [];
  const groupedOtherEvents = groupEventsByPoster(otherEvents);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-xl shadow-sm relative z-20">
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
            {/* メールアイコンとメッセージパネル */}
            <div className="relative" ref={messagePanelRef}>
              <button 
                onClick={() => setShowMessages(!showMessages)}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="お知らせ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full min-w-[18px] h-[18px]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showMessages && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 flex flex-col max-h-[60vh]">
                  {/* ★修正: max-h-[60vh] で画面高さに追従させ、バグを防ぐ */}
                  
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-bold text-gray-700 text-sm">お知らせ ({messages.length})</h3>
                    {unreadCount > 0 && <span className="text-xs text-red-600 font-bold">{unreadCount}件の未読</span>}
                  </div>
                  
                  <div className="overflow-y-auto flex-grow">
                    {messages.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">お知らせはありません</div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {messages.map((msg) => (
                          <div key={msg.id} className={`p-4 hover:bg-gray-50 transition-colors ${!msg.is_read ? 'bg-yellow-50' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-xs text-gray-600">
                                {msg.sender?.name || '管理者'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3 break-words">
                              {/* break-wordsで行の折り返しを保証 */}
                              {msg.content}
                            </p>
                            
                            <div className="flex justify-end items-center gap-3">
                              {/* 削除ボタン（ゴミ箱） */}
                              <button 
                                onClick={() => deleteMessage(msg.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="削除"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>

                              {/* 既読ボタン */}
                              {!msg.is_read && (
                                <button 
                                  onClick={() => markAsRead(msg.id)}
                                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  既読にする
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link 
              href="/admin/messages" 
              className="text-sm font-bold text-blue-600 border border-blue-300 px-4 py-2 rounded-lg hover:bg-blue-50 bg-white flex items-center gap-1"
            >
              <span>✉</span> {hasAdminPrivileges ? '送信' : '連絡'}
            </Link>

            <Link 
              href="/admin/profile" 
              className="text-sm font-bold text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 bg-white"
            >
              ⚙ プロフィール
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
                onToggleHidden={handleToggleHidden} 
                isSuperAdmin={isSuperAdmin} 
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
                      onToggleHidden={handleToggleHidden} 
                      isSuperAdmin={isSuperAdmin} 
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
  onDelete: (id: number, poster_id?: string, title?: string) => void, 
  onToggleHidden: (id: number, current: boolean, poster_id?: string, title?: string) => void,
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
              
              {isSuperAdmin && (
                <button
                  onClick={() => onToggleHidden(event.id, event.is_hidden, event.poster_id, event.title)}
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
                href={`/events/${event.id}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 font-bold mr-4 inline-flex items-center gap-1"
                title="実際のページを確認"
              >
                <span className="text-lg">👀</span> 確認
              </Link>

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
              <button onClick={() => onDelete(event.id, event.poster_id, event.title)} className="text-red-600 hover:text-red-900">
                削除
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}