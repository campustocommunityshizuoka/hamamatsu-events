'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// --- 型定義 ---
export type Event = {
  id: number;
  title: string;
  event_date: string;
  poster_id?: string;
  view_count?: number;
  is_hidden: boolean;
  image_url: string | null;
  category: string | null;
  profiles: { name: string | null } | null;
};

export type Message = {
  id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender: { name: string | null } | null;
};

export type MyProfile = {
  id: string;
  role: string;
  name: string | null;
  avatar_url: string | null;
};

export type Application = {
  id: number;
  organization_name: string;
  email: string;
  activity_details: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type Report = {
  id: number;
  reason: string;
  created_at: string;
  events: { id: number; title: string } | null;
};

const WORKER_URL = 'https://mail-sender.campustocommunityshizuoka.workers.dev/';

export function useAdminDashboard() {
  const router = useRouter();
  
  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  
  const [inviteUrl, setInviteUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  
  const [showMailMenu, setShowMailMenu] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [runTutorial, setRunTutorial] = useState(false);

  // Refs
  const mailMenuRef = useRef<HTMLDivElement>(null);
  const messagePanelRef = useRef<HTMLDivElement>(null);
  const applicationPanelRef = useRef<HTMLDivElement>(null);
  const reportPanelRef = useRef<HTMLDivElement>(null);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile) setMyProfile(profile);
      
      const role = profile?.role || 'poster';
      const hasAdminPrivileges = ['admin', 'super_admin'].includes(role);

      // イベント取得
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

      const { data: eventsData } = await query;
      if (eventsData) setEvents(eventsData as unknown as Event[]);

      // メッセージ取得
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, is_read,
          sender:sender_id ( name )
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (messagesData) setMessages(messagesData as unknown as Message[]);

      // 管理者用データ
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

      const hasSeenTutorial = localStorage.getItem('hasSeenAdminTutorial_v1');
      if (!hasSeenTutorial) {
        setTimeout(() => setRunTutorial(true), 1000);
      }
    };
    fetchData();
  }, [router]);

  useEffect(() => {
    setInviteUrl('https://hamamtsu-events.shizuoka-connect.com/api/invite?code=hamamatsu2025secret');
  }, []);

  // クリック外検知
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mailMenuRef.current && !mailMenuRef.current.contains(event.target as Node)) setShowMailMenu(false);
      if (applicationPanelRef.current && !applicationPanelRef.current.contains(event.target as Node)) setShowApplications(false);
      if (reportPanelRef.current && !reportPanelRef.current.contains(event.target as Node)) setShowReports(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- アクション ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const markAsRead = async (messageId: string) => {
    const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', messageId);
    if (!error) {
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, is_read: true } : msg));
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('このメッセージを削除してもよろしいですか？')) return;
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (!error) setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const deleteReport = async (reportId: number) => {
    if (!confirm('この通報を「対応済み」としてリストから削除しますか？')) return;
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    if (!error) setReports(prev => prev.filter(r => r.id !== reportId));
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
        const filePath = targetEvent.image_url.split('/event-images/')[1];
        if (filePath) await supabase.storage.from('event-images').remove([decodeURIComponent(filePath)]);
      }

      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;

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
      console.error(err);
      alert('削除エラーが発生しました');
    }
  };

  const handleToggleHidden = async (id: number, currentHiddenStatus: boolean, poster_id?: string, eventTitle?: string) => {
    if (myProfile?.role !== 'super_admin') {
      alert('この操作は特権管理者のみ可能です。');
      return;
    }
    const newStatus = !currentHiddenStatus;
    if (!window.confirm(`この投稿を「${newStatus ? '非表示' : '再公開'}」にしますか？`)) return;

    let hideReason = '';
    if (newStatus === true && poster_id && poster_id !== currentUserId) {
       const input = window.prompt(`非表示にする理由を入力して通知しますか？`);
       if (input === null) return;
       hideReason = input;
    }

    const { error } = await supabase.from('events').update({ is_hidden: newStatus }).eq('id', id);
    if (!error) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, is_hidden: newStatus } : e));
      if (hideReason && poster_id && currentUserId) {
         await supabase.from('messages').insert({
           sender_id: currentUserId,
           receiver_id: poster_id,
           content: `【管理者通知】投稿「${eventTitle}」は非表示に設定されました。\n理由: ${hideReason}`
         });
         alert("通知しました。");
      }
    }
  };

  const sendEmailViaWorker = async (toEmail: string, toName: string, subject: string, bodyText: string) => {
    await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail, toName, subject,
        htmlContent: `<p>${toName} 様</p><p>${bodyText.replace(/\n/g, '<br/>')}</p>`
      })
    });
  };

  const handleApprove = async (app: Application) => {
    if (!confirm(`「${app.organization_name}」を承認しますか？`)) return;
    const subject = "【浜松イベント情報】利用申請の承認と招待について";
    const body = `承認いたしました。\n\n▼登録用リンク\n${inviteUrl}\n\nよろしくお願いいたします。`;

    try {
      await sendEmailViaWorker(app.email, app.organization_name, subject, body);
      await supabase.from('applications').delete().eq('id', app.id);
      setApplications(prev => prev.filter(a => a.id !== app.id));
      alert('承認メールを送信し、完了しました。');
    } catch (e) {
      console.error("承認エラー:", e); // ★修正: エラーを表示
      alert("自動送信失敗。手動で対応してください。");
      window.location.href = `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const handleReject = async (id: number, email: string, name: string) => {
    const reason = window.prompt("却下の理由:", "活動内容が本サイトの趣旨と異なるため");
    if (reason === null) return;
    const subject = "【浜松イベント情報】利用申請の結果について";
    const body = `誠に残念ながら承認を見送らせていただくこととなりました。\n理由: ${reason}`;

    try {
      await sendEmailViaWorker(email, name, subject, body);
      await supabase.from('applications').delete().eq('id', id);
      setApplications(prev => prev.filter(a => a.id !== id));
      alert('却下メールを送信し、完了しました。');
    } catch (e) {
      console.error("却下エラー:", e); // ★修正: エラーを表示
      alert("送信失敗。手動で対応してください。");
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const handleTutorialClose = () => {
    setRunTutorial(false);
    localStorage.setItem('hasSeenAdminTutorial_v1', 'true');
  };

  return {
    // Data
    events, messages, applications, reports, loading, myProfile,
    inviteUrl, currentUserId,
    // UI State
    showQrCode, setShowQrCode,
    showMailMenu, setShowMailMenu,
    showMessages, setShowMessages,
    showApplications, setShowApplications,
    showReports, setShowReports,
    runTutorial, setRunTutorial,
    // Refs
    mailMenuRef, messagePanelRef, applicationPanelRef, reportPanelRef,
    // Actions
    handleLogout, markAsRead, deleteMessage, deleteReport, handleDelete, handleToggleHidden, handleApprove, handleReject, handleTutorialClose
  };
}