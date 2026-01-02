'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

// --- WorkerのURL定義 ---
const WORKER_URL = 'https://mail-sender.campustocommunityshizuoka.workers.dev/';

// --- 型定義 ---

type Event = {
  id: number;
  title: string;
  event_date: string;
  poster_id?: string;
  view_count?: number;
  is_hidden: boolean;
  image_url: string | null;
  category: string | null;
  profiles: {
    name: string | null;
  } | null;
};

type Message = {
  id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender: {
    name: string | null;
  } | null;
};

type MyProfile = {
  id: string;
  role: string;
  name: string | null;
  avatar_url: string | null;
};

type Application = {
  id: number;
  organization_name: string;
  email: string;
  activity_details: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type Report = {
  id: number;
  reason: string;
  created_at: string;
  events: {
    id: number;
    title: string;
  } | null;
};

// --- コンポーネント本体 ---

export default function AdminDashboard() {
  const router = useRouter();
  
  // State定義
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  
  // UI制御用State
  const [inviteUrl, setInviteUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  
  // パネル表示フラグ
  const [showMailMenu, setShowMailMenu] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [showReports, setShowReports] = useState(false);
  
  const mailMenuRef = useRef<HTMLDivElement>(null);
  const messagePanelRef = useRef<HTMLDivElement>(null);
  const applicationPanelRef = useRef<HTMLDivElement>(null);
  const reportPanelRef = useRef<HTMLDivElement>(null);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      // 1. ユーザー確認
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      setCurrentUserId(user.id);

      // 2. プロフィール取得
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
          id, title, event_date, poster_id, view_count, is_hidden, image_url, category,
          profiles ( name )
        `)
        .order('event_date', { ascending: false });

      if (!hasAdminPrivileges) {
        query = query.eq('poster_id', user.id);
      }

      const { data: eventsData, error: eventsError } = await query;
      if (eventsError) console.error("データ取得エラー:", eventsError);
      if (eventsData) setEvents(eventsData as unknown as Event[]);

      // 4. メッセージ取得
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, is_read,
          sender:sender_id ( name )
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (messagesError) console.error("メッセージ取得エラー:", messagesError);
      if (messagesData) setMessages(messagesData as unknown as Message[]);

      // 5. 管理者用データ取得
      if (hasAdminPrivileges) {
        const { data: appsData } = await supabase
          .from('applications')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (appsData) setApplications(appsData as Application[]);

        const { data: reportsData } = await supabase
          .from('reports')
          .select(`
            id, reason, created_at,
            events ( id, title )
          `)
          .order('created_at', { ascending: false });

        if (reportsData) setReports(reportsData as unknown as Report[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  useEffect(() => {
    setInviteUrl('https://hamamtsu-events.shizuoka-connect.com/api/invite?code=hamamatsu2025secret');
  }, []);

  // クリック外検知
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mailMenuRef.current && !mailMenuRef.current.contains(event.target as Node)) {
        setShowMailMenu(false);
      }
      if (messagePanelRef.current && !messagePanelRef.current.contains(event.target as Node)) {
        // setShowMessages(false); // バッティング防止のためコメントアウト
      }
      if (applicationPanelRef.current && !applicationPanelRef.current.contains(event.target as Node)) {
        setShowApplications(false);
      }
      if (reportPanelRef.current && !reportPanelRef.current.contains(event.target as Node)) {
        setShowReports(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- アクション関数群 ---

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

  const deleteMessage = async (messageId: string) => {
    if (!confirm('このメッセージを削除してもよろしいですか？')) return;
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error("削除エラー:", err);
      alert('メッセージの削除に失敗しました。');
    }
  };

  const deleteReport = async (reportId: number) => {
    if (!confirm('この通報を「対応済み」としてリストから削除しますか？')) return;
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error("通報削除エラー:", err);
      alert('削除に失敗しました');
    }
  };

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
      const targetEvent = events.find(e => e.id === id);
      if (targetEvent?.image_url) {
        const filePath = getFilePathFromUrl(targetEvent.image_url);
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('event-images')
            .remove([filePath]);
          if (storageError) console.error('画像削除エラー:', storageError);
        }
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("削除エラー:", error);
        alert('削除できませんでした。');
        return; 
      }

      if (deleteReason && poster_id && currentUserId) {
        await supabase.from('messages').insert({
          sender_id: currentUserId,
          receiver_id: poster_id,
          content: `【重要】あなたの投稿「${eventTitle || '不明なイベント'}」は管理者により削除されました。\n\n理由: ${deleteReason}`
        });
        alert("ユーザーに削除理由を通知しました。");
      }

      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (!deleteReason) alert('削除しました');

    } catch (err) {
      console.error("予期せぬエラー:", err);
      alert('システムエラーが発生しました。');
    }
  };

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
        alert(`${actionName}に設定できませんでした。`);
        return;
      }

      if (hideReason && poster_id && currentUserId) {
         await supabase.from('messages').insert({
           sender_id: currentUserId,
           receiver_id: poster_id,
           content: `【管理者通知】あなたの投稿「${eventTitle || '不明なイベント'}」は管理者により非表示に設定されました。\n\n理由: ${hideReason}`
         });
         alert("ユーザーに理由を通知しました。");
      }

      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, is_hidden: newStatus } : e));
      
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

  const sendEmailViaWorker = async (toEmail: string, toName: string, subject: string, bodyText: string) => {
    const htmlContent = `
      <p>${toName} 様</p>
      <p>${bodyText.replace(/\n/g, '<br/>')}</p>
    `;

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail,
        toName,
        subject,
        htmlContent
      })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || '送信APIエラー');
    }
  };

  const handleApprove = async (app: Application) => {
    if (!confirm(`「${app.organization_name}」を承認しますか？`)) return;

    const subject = "【浜松イベント情報】利用申請の承認と招待について";
    const body = 
      `浜松イベント情報への利用申請ありがとうございます。\n` +
      `内容を確認し、アカウント作成を承認いたしました。\n\n` +
      `以下のリンクより、24時間以内にアカウント登録をお願いいたします。\n\n` +
      `▼登録用リンク\n` +
      `${inviteUrl}\n\n` +
      `よろしくお願いいたします。`;

    let autoSendSuccess = false;

    try {
      await sendEmailViaWorker(app.email, app.organization_name, subject, body);
      autoSendSuccess = true;
    } catch (e) {
      console.error("自動送信失敗:", e);
      alert("自動送信に失敗しました。メールソフトを起動しますので、手動で送信してください。");
      const mailtoLink = `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
    }

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', app.id);

      if (error) throw error;

      setApplications(prev => prev.filter(a => a.id !== app.id));
      
      if (autoSendSuccess) {
        alert('承認メールを自動送信し、処理を完了しました。');
      } 
    } catch (err) {
      console.error(err);
      alert('データベースからの削除に失敗しました（メール処理は実行されましたが、データが残っています）');
    }
  };

  const handleReject = async (id: number, email: string, name: string) => {
    const reason = window.prompt("却下の理由を入力してください（相手へのメールに記載されます）:\n※空欄でキャンセル", "活動内容が本サイトの趣旨と異なるため");
    if (reason === null) return;

    const subject = "【浜松イベント情報】利用申請の結果について";
    const body = 
      `浜松イベント情報への利用申請ありがとうございます。\n` +
      `内容を確認いたしましたが、誠に残念ながら今回は以下の理由により承認を見送らせていただくこととなりました。\n\n` +
      `理由: ${reason}\n\n` +
      `何卒ご了承くださいますようお願い申し上げます。`;

    let autoSendSuccess = false;

    try {
      await sendEmailViaWorker(email, name, subject, body);
      autoSendSuccess = true;
    } catch (e) {
      console.error("自動送信失敗:", e);
      alert("自動送信に失敗しました。メールソフトを起動しますので、手動で送信してください。");
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
    }

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setApplications(prev => prev.filter(a => a.id !== id));
      
      if (autoSendSuccess) {
        alert('却下メールを自動送信し、処理を完了しました。');
      }

    } catch (err) {
      console.error("却下処理エラー:", err);
      alert('データベースからの削除に失敗しました');
    }
  };

  const splitEventsByDate = (list: Event[]) => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = list.filter(e => e.event_date >= today);
    const past = list.filter(e => e.event_date < today);
    return { upcoming, past };
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;

  const hasAdminPrivileges = ['admin', 'super_admin'].includes(myProfile?.role || '');
  const isSuperAdmin = myProfile?.role === 'super_admin';
  const unreadCount = messages.filter(m => !m.is_read).length;
  const pendingAppsCount = applications.length;
  const reportsCount = reports.length;

  const myEvents = hasAdminPrivileges ? events.filter(e => e.poster_id === currentUserId) : [];
  const otherEvents = hasAdminPrivileges ? events.filter(e => e.poster_id !== currentUserId) : [];
  const groupedOtherEvents = groupEventsByPoster(otherEvents);
  
  const { upcoming: myUpcoming, past: myPast } = splitEventsByDate(hasAdminPrivileges ? myEvents : events);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm relative z-20">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="My Icon" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs md:text-base">No Img</div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold">マイページ</h1>
                <Link href="/" className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 border border-blue-200">
                  <span>🏠</span> ホーム
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-gray-600 font-medium text-sm md:text-base">
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

          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
            
            {hasAdminPrivileges && (
              <>
                {/* 通報ボタン */}
                <div className="relative" ref={reportPanelRef}>
                  <button
                    onClick={() => setShowReports(!showReports)}
                    className="relative px-3 py-2 text-red-700 font-bold hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 border border-red-200 text-sm"
                    title="通報一覧"
                  >
                    <span>⚠️ 通報</span>
                    {reportsCount > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                        {reportsCount}
                      </span>
                    )}
                  </button>

                  {/* 通報リストポップアップ */}
                  {showReports && (
                    <>
                      <div 
                        className="fixed inset-0 bg-black/20 z-40 md:hidden"
                        onClick={() => setShowReports(false)}
                      />
                      <div className="fixed top-20 left-4 right-4 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:w-96 bg-white rounded-lg shadow-xl border border-red-200 overflow-hidden flex flex-col max-h-[70vh]">
                        <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex justify-between items-center flex-shrink-0">
                          <h3 className="font-bold text-red-800 text-sm">不適切な投稿の報告 ({reportsCount})</h3>
                          <button onClick={() => setShowReports(false)} className="md:hidden text-gray-500">✕</button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                          {reports.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">現在、通報はありません</div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {reports.map((report) => (
                                <div key={report.id} className="p-4 hover:bg-gray-50 transition-colors">
                                  <div className="mb-2">
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">Reason</span>
                                    <p className="text-sm font-bold text-gray-800 mt-1 whitespace-pre-wrap">{report.reason}</p>
                                  </div>
                                  
                                  {report.events ? (
                                    <div className="bg-gray-100 p-2 rounded mb-2 text-xs">
                                      <p className="text-gray-500">対象イベント:</p>
                                      <Link href={`/events/${report.events.id}`} target="_blank" className="text-blue-600 font-bold hover:underline truncate block">
                                        {report.events.title}
                                      </Link>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 mb-2">※対象イベントは既に削除されました</p>
                                  )}

                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-gray-400">{formatDate(report.created_at)}</span>
                                    <button 
                                      onClick={() => deleteReport(report.id)}
                                      className="text-xs text-gray-500 hover:text-red-600 underline"
                                    >
                                      対応済みとして削除
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 申請ボックスボタン */}
                <div className="relative" ref={applicationPanelRef}>
                  <button
                    onClick={() => setShowApplications(!showApplications)}
                    className="relative px-3 py-2 text-orange-700 font-bold hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-2 border border-orange-200 text-sm"
                    title="申請ボックス"
                  >
                    <span>新規申請</span>
                    {pendingAppsCount > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                        {pendingAppsCount}
                      </span>
                    )}
                  </button>

                  {/* 申請リストポップアップ */}
                  {showApplications && (
                    <>
                      <div 
                        className="fixed inset-0 bg-black/20 z-40 md:hidden"
                        onClick={() => setShowApplications(false)}
                      />
                      <div className="fixed top-20 left-4 right-4 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:w-96 bg-white rounded-lg shadow-xl border border-orange-200 overflow-hidden flex flex-col max-h-[70vh]">
                        <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex justify-between items-center flex-shrink-0">
                          <h3 className="font-bold text-orange-800 text-sm">新規利用申請 ({pendingAppsCount})</h3>
                          <button onClick={() => setShowApplications(false)} className="md:hidden text-gray-500">✕</button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                          {applications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">現在、未対応の申請はありません</div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {applications.map((app) => (
                                <div key={app.id} className="p-4 hover:bg-gray-50 transition-colors">
                                  <div className="mb-2">
                                    <h4 className="font-bold text-sm text-gray-800">{app.organization_name}</h4>
                                    <p className="text-xs text-gray-500 font-mono mb-1">{app.email}</p>
                                    <p className="text-xs text-gray-400">{formatDate(app.created_at)}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 mb-3 whitespace-pre-wrap">
                                    {app.activity_details}
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button 
                                      onClick={() => handleReject(app.id, app.email, app.organization_name)}
                                      className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded border border-gray-300"
                                    >
                                      却下
                                    </button>
                                    <button 
                                      onClick={() => handleApprove(app)}
                                      className="px-3 py-1 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded"
                                    >
                                      承認・招待
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* メールメニュー */}
            <div className="relative" ref={mailMenuRef}>
              <button 
                onClick={() => setShowMailMenu(!showMailMenu)}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1"
                title="メール"
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

              {/* メール選択メニュー */}
              {showMailMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 animate-fadeIn">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowMailMenu(false);
                        setShowMessages(true); // 受信箱を開く
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex justify-between items-center"
                    >
                      <span>📥 お知らせ (受信)</span>
                      {unreadCount > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                    </button>
                    <Link
                      href="/admin/messages"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded block"
                      onClick={() => setShowMailMenu(false)}
                    >
                      📤 メッセージ作成
                    </Link>
                  </div>
                </div>
              )}

              {/* 受信箱パネル (スマホ対応) */}
              {showMessages && (
                <>
                  <div 
                    className="fixed inset-0 bg-black/20 z-40 md:hidden"
                    onClick={() => setShowMessages(false)}
                  />
                  <div className="fixed top-20 left-4 right-4 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[70vh]">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                      <h3 className="font-bold text-gray-700 text-sm">お知らせ ({messages.length})</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && <span className="text-xs text-red-600 font-bold">{unreadCount}件の未読</span>}
                        <button onClick={() => setShowMessages(false)} className="md:hidden text-gray-500 ml-2">✕</button>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-grow">
                      {messages.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">お知らせはありません</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {messages.map((msg) => (
                            <div key={msg.id} className={`p-4 hover:bg-gray-50 transition-colors ${!msg.is_read ? 'bg-yellow-50' : ''}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-gray-600">{msg.sender?.name || '管理者'}</span>
                                <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3 break-words">{msg.content}</p>
                              <div className="flex justify-end items-center gap-3">
                                <button onClick={() => deleteMessage(msg.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="削除">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                                {!msg.is_read && (
                                  <button onClick={() => markAsRead(msg.id)} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold">
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
                </>
              )}
            </div>

            <Link href="/admin/profile" className="text-sm font-bold text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 bg-white">
              <span className="md:hidden">⚙</span>
              <span className="hidden md:inline">⚙ プロフィール</span>
            </Link>
            
            <button onClick={handleLogout} className="text-xs md:text-sm text-red-600 underline ml-2 whitespace-nowrap">
              ログアウト
            </button>
          </div>
        </div>

        {/* ... (QRコード等は変更なし) ... */}
        {hasAdminPrivileges && (
          <div className="mb-8">
             <button
               onClick={() => setShowQrCode(!showQrCode)}
               className="w-full md:w-auto flex justify-center items-center gap-2 text-teal-700 font-bold border border-teal-300 bg-teal-50 px-4 py-3 rounded-lg hover:bg-teal-100 transition shadow-sm"
             >
               <span className="text-xl">🎟️</span>
               {showQrCode ? '招待QRコードを隠す' : '手動招待用QRコードを表示'}
             </button>
             {showQrCode && (
               <div className="mt-4 bg-white p-6 rounded-xl shadow-md border border-teal-200 flex flex-col md:flex-row items-center gap-6 animate-fadeIn">
                 <div className="bg-white p-2 border border-gray-200 rounded-lg flex justify-center">
                   {inviteUrl && <QRCodeSVG value={inviteUrl} size={150} />}
                 </div>
                 <div className="flex-1">
                   <h3 className="font-bold text-lg text-teal-800 mb-2">手動招待用QRコード</h3>
                   <p className="text-sm text-gray-600 mb-3">
                     基本は上の「新規申請」ボタンから招待を送りますが、<br/>
                     対面などで直接招待する場合にこのコードを使用してください。
                   </p>
                   <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-500 break-all font-mono border border-gray-200">
                     {inviteUrl}
                   </div>
                 </div>
               </div>
             )}
          </div>
        )}

        <div className="mb-6">
          <Link href="/admin/create" className="block w-full md:w-auto text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-blue-700">
            + 新しいイベントを作る
          </Link>
        </div>

        {/* --- イベントリスト表示 --- */}
        {hasAdminPrivileges ? (
          <div className="space-y-10">
            {/* 自分の投稿 */}
            <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-blue-100">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                <h3 className="font-bold text-blue-800 text-sm md:text-base">📌 あなた（{myProfile?.role === 'super_admin' ? '特権管理者' : '全体管理者'}）の投稿</h3>
              </div>
              
              <EventTable 
                events={myUpcoming} 
                onDelete={handleDelete} 
                onToggleHidden={handleToggleHidden} 
                isSuperAdmin={isSuperAdmin} 
                emptyMessage="開催予定の投稿はありません。" 
              />
              
              {myPast.length > 0 && (
                <details className="group border-t border-gray-100">
                  <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    終了したイベントを表示 ({myPast.length})
                  </summary>
                  <EventTable 
                    events={myPast} 
                    onDelete={handleDelete} 
                    onToggleHidden={handleToggleHidden} 
                    isSuperAdmin={isSuperAdmin} 
                  />
                </details>
              )}
            </div>

            {/* 他の団体の投稿 */}
            {Object.keys(groupedOtherEvents).length > 0 && (
              <div className="space-y-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-700 pl-2 border-l-4 border-gray-400">他の団体の投稿</h2>
                {Object.entries(groupedOtherEvents).map(([posterName, groupEvents]) => {
                  const { upcoming: groupUpcoming, past: groupPast } = splitEventsByDate(groupEvents);
                  
                  return (
                    <div key={posterName} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-bold text-gray-700 text-sm md:text-base">📂 {posterName}</h3>
                      </div>
                      
                      <EventTable 
                        events={groupUpcoming} 
                        onDelete={handleDelete} 
                        onToggleHidden={handleToggleHidden} 
                        isSuperAdmin={isSuperAdmin}
                        emptyMessage="開催予定の投稿はありません。"
                      />

                      {groupPast.length > 0 && (
                         <details className="group border-t border-gray-100">
                           <summary className="cursor-pointer bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 flex items-center gap-2">
                             <span className="group-open:rotate-90 transition-transform">▶</span>
                             終了したイベント ({groupPast.length})
                           </summary>
                           <EventTable 
                             events={groupPast} 
                             onDelete={handleDelete} 
                             onToggleHidden={handleToggleHidden} 
                             isSuperAdmin={isSuperAdmin} 
                           />
                         </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // 一般投稿者
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-teal-50 px-4 py-3 border-b border-teal-100">
              <h3 className="font-bold text-teal-800 text-sm md:text-base">開催予定・開催中のイベント</h3>
            </div>
            <EventTable 
              events={myUpcoming} 
              onDelete={handleDelete} 
              onToggleHidden={handleToggleHidden} 
              isSuperAdmin={isSuperAdmin} 
              emptyMessage="現在、掲載中のイベントはありません。"
            />

            {myPast.length > 0 && (
              <details className="group border-t border-gray-200">
                <summary className="cursor-pointer bg-gray-100 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-200 flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  終了したイベントを表示 ({myPast.length})
                </summary>
                <div className="bg-gray-50">
                  <EventTable 
                    events={myPast} 
                    onDelete={handleDelete} 
                    onToggleHidden={handleToggleHidden} 
                    isSuperAdmin={isSuperAdmin} 
                  />
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- テーブルコンポーネント（PCレイアウト修正 & 「隠す」→「非公開」） ---
function EventTable({ events, onDelete, onToggleHidden, isSuperAdmin, emptyMessage = "投稿がありません" }: { 
  events: Event[], 
  onDelete: (id: number, poster_id?: string, title?: string) => void, 
  onToggleHidden: (id: number, current: boolean, poster_id?: string, title?: string) => void,
  isSuperAdmin: boolean,
  emptyMessage?: string 
}) {
  if (events.length === 0) {
    return <div className="p-6 text-center text-gray-400 text-sm">{emptyMessage}</div>;
  }

  return (
    <div className="w-full">
      {/* PC表示用ヘッダー (md以上で表示) */}
      <div className="hidden md:grid grid-cols-12 bg-gray-50 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
        <div className="col-span-2">開催日</div>
        {/* タイトル列を少し減らして操作列を広げる */}
        <div className="col-span-5">イベント名</div>
        <div className="col-span-1 text-center">閲覧数</div>
        <div className="col-span-4 text-right">操作</div>
      </div>

      <div className="divide-y divide-gray-200">
        {events.map((event) => (
          <div key={event.id} className={`p-4 md:px-6 md:py-4 ${event.is_hidden ? "bg-gray-100" : "bg-white"}`}>
            
            {/* --- スマホ用レイアウト (md未満) --- */}
            <div className="md:hidden">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500 font-mono">{event.event_date}</span>
                {event.is_hidden && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white">非表示中</span>
                )}
              </div>
              
              <Link href={`/admin/edit/${event.id}`} className={`block text-base font-bold mb-2 ${event.is_hidden ? 'text-gray-500' : 'text-gray-900'}`}>
                {event.title}
              </Link>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {event.category && (
                  <span className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded border border-teal-100">
                    {event.category}
                  </span>
                )}
                <span className="text-xs text-gray-500">閲覧数: <span className="font-bold">{event.view_count || 0}</span></span>
              </div>

              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
                {isSuperAdmin && (
                  <button
                    onClick={() => onToggleHidden(event.id, event.is_hidden, event.poster_id, event.title)}
                    className={`text-xs font-bold ${event.is_hidden ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    {event.is_hidden ? '公開する' : '非公開'}
                  </button>
                )}
                <Link href={`/events/${event.id}`} target="_blank" className="text-xs text-gray-500 font-bold">確認</Link>
                <Link href={`/admin/create?copy_from=${event.id}`} className="text-xs text-teal-600 font-bold">コピー</Link>
                <Link href={`/admin/edit/${event.id}`} className="text-xs text-indigo-600 font-bold">編集</Link>
                <button onClick={() => onDelete(event.id, event.poster_id, event.title)} className="text-xs text-red-600">削除</button>
              </div>
            </div>

            {/* --- PC用レイアウト (md以上) --- */}
            <div className="hidden md:grid grid-cols-12 items-center">
              <div className="col-span-2 text-sm text-gray-500">
                {event.event_date}
                {event.is_hidden && (
                  <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-500 text-white">非表示</span>
                )}
              </div>
              <div className="col-span-5">
                <Link href={`/admin/edit/${event.id}`} className={`text-sm font-medium hover:underline ${event.is_hidden ? 'text-gray-500' : 'text-gray-900'}`}>
                  {event.title}
                </Link>
                {event.category && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded border border-teal-100">
                    {event.category}
                  </span>
                )}
              </div>
              <div className="col-span-1 text-center text-sm font-bold text-gray-600">
                {event.view_count || 0}
              </div>
              {/* 操作ボタンエリアを広げ、flexで横並びを確実に */}
              <div className="col-span-4 text-right text-sm font-medium flex justify-end items-center gap-4">
                {isSuperAdmin && (
                  <button
                    onClick={() => onToggleHidden(event.id, event.is_hidden, event.poster_id, event.title)}
                    className={`${event.is_hidden ? 'text-blue-600' : 'text-gray-400'} whitespace-nowrap`}
                  >
                    {event.is_hidden ? '公開' : '非公開'}
                  </button>
                )}
                <Link href={`/events/${event.id}`} target="_blank" className="text-gray-500 hover:text-gray-900 whitespace-nowrap">確認</Link>
                <Link href={`/admin/create?copy_from=${event.id}`} className="text-teal-600 hover:text-teal-900 whitespace-nowrap">コピー</Link>
                <Link href={`/admin/edit/${event.id}`} className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap">編集</Link>
                <button onClick={() => onDelete(event.id, event.poster_id, event.title)} className="text-red-600 hover:text-red-900 whitespace-nowrap">削除</button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}