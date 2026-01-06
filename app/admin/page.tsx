'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import Tutorial from '@/app/components/Tutorial';
import { useAdminDashboard, Event } from '@/app/hooks/useAdminDashboard';

export default function AdminDashboard() {
  // すべてのロジックとデータをフックから取得
  const {
    events, messages, applications, reports, loading, myProfile, inviteUrl, currentUserId,
    showQrCode, setShowQrCode, showMailMenu, setShowMailMenu, showMessages, setShowMessages,
    showApplications, setShowApplications, showReports, setShowReports, runTutorial, setRunTutorial,
    // ★修正: messagePanelRef を削除しました
    mailMenuRef, applicationPanelRef, reportPanelRef,
    handleLogout, markAsRead, deleteMessage, deleteReport, handleDelete, handleToggleHidden, handleApprove, handleReject, handleTutorialClose
  } = useAdminDashboard();

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;

  const hasAdminPrivileges = ['admin', 'super_admin'].includes(myProfile?.role || '');
  const isSuperAdmin = myProfile?.role === 'super_admin';
  const unreadCount = messages.filter(m => !m.is_read).length;
  const pendingAppsCount = applications.length;
  const reportsCount = reports.length;

  // イベントの振り分け
  const splitEventsByDate = (list: Event[]) => {
    const today = new Date().toISOString().split('T')[0];
    return {
      upcoming: list.filter(e => e.event_date >= today),
      past: list.filter(e => e.event_date < today)
    };
  };

  // 自分のイベント
  const myEvents = hasAdminPrivileges ? events.filter(e => e.poster_id === currentUserId) : events;
  const { upcoming: myUpcoming, past: myPast } = splitEventsByDate(myEvents);

  // 管理者用：他人のイベント
  const otherEvents = hasAdminPrivileges ? events.filter(e => e.poster_id !== currentUserId) : [];
  const groupedOtherEvents: Record<string, Event[]> = {};
  otherEvents.forEach(e => {
    const name = e.profiles?.name || '不明';
    if (!groupedOtherEvents[name]) groupedOtherEvents[name] = [];
    groupedOtherEvents[name].push(e);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Tutorial run={runTutorial} onClose={handleTutorialClose} isAdmin={hasAdminPrivileges} />

      <div className="max-w-4xl mx-auto">
        {/* ヘッダーエリア */}
        <div id="tutorial-header" className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm relative z-20">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Icon" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">No Img</div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold">マイページ</h1>
                <Link href="/" className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 border border-blue-200">
                  <span>🏠</span> ホーム
                </Link>
                <button onClick={() => setRunTutorial(true)} className="text-xs text-gray-400 underline hover:text-gray-600">? ヘルプ</button>
              </div>
              <p className="text-gray-600 font-medium text-sm md:text-base mt-1">
                {myProfile?.name || '名無し'} さん
                {hasAdminPrivileges && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">管理者</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
            {hasAdminPrivileges && (
              <>
                {/* 通報ボタン */}
                <div className="relative" ref={reportPanelRef} id="tutorial-report">
                  <button onClick={() => setShowReports(!showReports)} className="relative px-3 py-2 text-red-700 font-bold hover:bg-red-50 rounded-lg border border-red-200 text-sm flex items-center gap-2">
                    <span>⚠️ 通報</span>
                    {reportsCount > 0 && <span className="px-1.5 py-0.5 text-xs text-white bg-red-600 rounded-full animate-pulse">{reportsCount}</span>}
                  </button>
                  {showReports && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-red-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
                      {reports.length === 0 ? <div className="p-4 text-center text-gray-500 text-sm">なし</div> : (
                        reports.map(r => (
                          <div key={r.id} className="p-3 border-b hover:bg-gray-50">
                            <p className="text-xs font-bold text-red-800">{r.reason}</p>
                            <p className="text-xs text-gray-500 mt-1">対象: {r.events?.title || '削除済'}</p>
                            <button onClick={() => deleteReport(r.id)} className="text-xs text-red-600 underline mt-2">対応済として削除</button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 申請ボタン */}
                <div className="relative" ref={applicationPanelRef} id="tutorial-application">
                  <button onClick={() => setShowApplications(!showApplications)} className="relative px-3 py-2 text-orange-700 font-bold hover:bg-orange-50 rounded-lg border border-orange-200 text-sm flex items-center gap-2">
                    <span>新規申請</span>
                    {pendingAppsCount > 0 && <span className="px-1.5 py-0.5 text-xs text-white bg-red-600 rounded-full animate-pulse">{pendingAppsCount}</span>}
                  </button>
                  {showApplications && (
                    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-orange-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
                      {applications.length === 0 ? <div className="p-4 text-center text-gray-500 text-sm">なし</div> : (
                        applications.map(app => (
                          <div key={app.id} className="p-4 border-b hover:bg-gray-50">
                            <h4 className="font-bold text-sm">{app.organization_name}</h4>
                            <p className="text-xs text-gray-500 mb-2">{app.activity_details}</p>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleReject(app.id, app.email, app.organization_name)} className="px-2 py-1 text-xs border rounded">却下</button>
                              <button onClick={() => handleApprove(app)} className="px-2 py-1 text-xs bg-orange-500 text-white rounded font-bold">承認</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* メールメニュー */}
            <div className="relative" ref={mailMenuRef} id="tutorial-mail">
              <button onClick={() => setShowMailMenu(!showMailMenu)} className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <span className="text-xl">📩</span>
                {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>}
              </button>
              {showMailMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50">
                  <button onClick={() => { setShowMailMenu(false); setShowMessages(true); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex justify-between">
                    <span>📥 受信箱</span>
                    {unreadCount > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 rounded-full">{unreadCount}</span>}
                  </button>
                  <Link href="/admin/messages" className="block px-4 py-2 text-sm hover:bg-gray-100">📤 作成</Link>
                </div>
              )}
              {showMessages && (
                <>
                  <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowMessages(false)} />
                  <div className="fixed top-20 right-4 w-96 bg-white rounded-lg shadow-xl z-50 max-h-[70vh] overflow-y-auto border">
                    <div className="p-3 bg-gray-50 border-b flex justify-between font-bold text-sm">
                      <span>お知らせ</span>
                      <button onClick={() => setShowMessages(false)}>✕</button>
                    </div>
                    {messages.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">なし</div> : (
                      messages.map(msg => (
                        <div key={msg.id} className={`p-4 border-b ${!msg.is_read ? 'bg-yellow-50' : ''}`}>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span className="font-bold">{msg.sender?.name || '管理者'}</span>
                            <span>{formatDate(msg.created_at)}</span>
                          </div>
                          <p className="text-sm mb-2">{msg.content}</p>
                          <div className="flex justify-end gap-3">
                            {!msg.is_read && <button onClick={() => markAsRead(msg.id)} className="text-xs text-blue-600 font-bold">既読にする</button>}
                            <button onClick={() => deleteMessage(msg.id)} className="text-xs text-gray-400 hover:text-red-600">削除</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <Link href="/admin/profile" id="tutorial-profile" className="text-sm font-bold text-gray-600 border px-3 py-2 rounded-lg hover:bg-gray-100 bg-white">
              ⚙ プロフィール
            </Link>
            <button onClick={handleLogout} className="text-xs text-red-600 underline">ログアウト</button>
          </div>
        </div>

        {/* QRコード表示エリア */}
        {hasAdminPrivileges && (
          <div className="mb-6">
            <button onClick={() => setShowQrCode(!showQrCode)} className="w-full md:w-auto flex items-center gap-2 text-teal-700 font-bold border border-teal-300 bg-teal-50 px-4 py-3 rounded-lg hover:bg-teal-100 shadow-sm">
              <span className="text-xl">🎟️</span> {showQrCode ? '招待QRを隠す' : '手動招待用QRを表示'}
            </button>
            {showQrCode && (
              <div className="mt-4 bg-white p-6 rounded-xl shadow border border-teal-200 flex flex-col md:flex-row items-center gap-6">
                <div className="p-2 border rounded">{inviteUrl && <QRCodeSVG value={inviteUrl} size={150} />}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-teal-800">手動招待用QRコード</h3>
                  <p className="text-sm text-gray-600 mt-2 break-all font-mono bg-gray-100 p-2 rounded">{inviteUrl}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <Link href="/admin/create" id="tutorial-create-btn" className="block w-full md:w-auto text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-blue-700 mb-8">
          + 新しいイベントを作る
        </Link>

        {/* イベントリスト */}
        {hasAdminPrivileges ? (
          <div className="space-y-10">
            {/* 自分の投稿 */}
            <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-blue-100">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                <h3 className="font-bold text-blue-800 text-sm">📌 あなたの投稿</h3>
              </div>
              <EventTable events={myUpcoming} onDelete={handleDelete} onToggleHidden={handleToggleHidden} isSuperAdmin={isSuperAdmin} emptyMessage="開催予定の投稿はありません。" />
              {myPast.length > 0 && (
                <details className="group border-t border-gray-100">
                  <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500 flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">▶</span> 終了したイベント ({myPast.length})
                  </summary>
                  <EventTable events={myPast} onDelete={handleDelete} onToggleHidden={handleToggleHidden} isSuperAdmin={isSuperAdmin} />
                </details>
              )}
            </div>

            {/* 他の団体の投稿 */}
            {Object.keys(groupedOtherEvents).length > 0 && (
              <div className="space-y-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-700 pl-2 border-l-4 border-gray-400">他の団体の投稿</h2>
                {Object.entries(groupedOtherEvents).map(([name, list]) => {
                  const { upcoming, past } = splitEventsByDate(list);
                  return (
                    <div key={name} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 border-b"><h3 className="font-bold text-gray-700 text-sm">📂 {name}</h3></div>
                      <EventTable events={upcoming} onDelete={handleDelete} onToggleHidden={handleToggleHidden} isSuperAdmin={isSuperAdmin} emptyMessage="予定なし" />
                      {past.length > 0 && (
                         <details className="group border-t border-gray-100">
                           <summary className="cursor-pointer bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 flex gap-2"><span className="group-open:rotate-90 transition-transform">▶</span> 終了分 ({past.length})</summary>
                           <EventTable events={past} onDelete={handleDelete} onToggleHidden={handleToggleHidden} isSuperAdmin={isSuperAdmin} />
                         </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 一般投稿者用 */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-teal-50 px-4 py-3 border-b border-teal-100"><h3 className="font-bold text-teal-800 text-sm">開催予定・開催中のイベント</h3></div>
            <EventTable events={myUpcoming} onDelete={handleDelete} onToggleHidden={handleToggleHidden} isSuperAdmin={isSuperAdmin} emptyMessage="掲載中のイベントはありません。" />
            {myPast.length > 0 && (
              <details className="group border-t border-gray-200">
                <summary className="cursor-pointer bg-gray-100 px-4 py-3 text-sm font-bold text-gray-500 flex gap-2"><span className="group-open:rotate-90 transition-transform">▶</span> 終了したイベント ({myPast.length})</summary>
                <div className="bg-gray-50"><EventTable events={myPast} onDelete={handleDelete} onToggleHidden={handleToggleHidden} isSuperAdmin={isSuperAdmin} /></div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// テーブルコンポーネント
function EventTable({ events, onDelete, onToggleHidden, isSuperAdmin, emptyMessage = "投稿がありません" }: { 
  events: Event[], 
  onDelete: (id: number, poster_id?: string, title?: string) => void, 
  onToggleHidden: (id: number, current: boolean, poster_id?: string, title?: string) => void,
  isSuperAdmin: boolean,
  emptyMessage?: string 
}) {
  if (events.length === 0) return <div className="p-6 text-center text-gray-400 text-sm">{emptyMessage}</div>;

  return (
    <div className="w-full">
      <div className="hidden md:grid grid-cols-12 bg-gray-50 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
        <div className="col-span-2">開催日</div>
        <div className="col-span-5">イベント名</div>
        <div className="col-span-1 text-center">閲覧数</div>
        <div className="col-span-4 text-right">操作</div>
      </div>
      <div className="divide-y divide-gray-200">
        {events.map((event) => (
          <div key={event.id} className={`p-4 md:px-6 md:py-4 ${event.is_hidden ? "bg-gray-100" : "bg-white"}`}>
            {/* スマホ */}
            <div className="md:hidden">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500 font-mono">{event.event_date}</span>
                {event.is_hidden && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white">非表示中</span>}
              </div>
              <Link href={`/admin/edit/${event.id}`} className={`block text-base font-bold mb-2 ${event.is_hidden ? 'text-gray-500' : 'text-gray-900'}`}>{event.title}</Link>
              <div className="flex flex-wrap gap-2 mb-3">
                {event.category && <span className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded border border-teal-100">{event.category}</span>}
                <span className="text-xs text-gray-500">閲覧数: <span className="font-bold">{event.view_count || 0}</span></span>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
                {isSuperAdmin && <button onClick={() => onToggleHidden(event.id, event.is_hidden, event.poster_id, event.title)} className={`text-xs font-bold ${event.is_hidden ? 'text-blue-600' : 'text-gray-400'}`}>{event.is_hidden ? '公開する' : '非公開'}</button>}
                <Link href={`/events/${event.id}`} target="_blank" className="text-xs text-gray-500 font-bold">確認</Link>
                <Link href={`/admin/create?copy_from=${event.id}`} className="text-xs text-teal-600 font-bold">コピー</Link>
                <Link href={`/admin/edit/${event.id}`} className="text-xs text-indigo-600 font-bold">編集</Link>
                <button onClick={() => onDelete(event.id, event.poster_id, event.title)} className="text-xs text-red-600">削除</button>
              </div>
            </div>
            {/* PC */}
            <div className="hidden md:grid grid-cols-12 items-center">
              <div className="col-span-2 text-sm text-gray-500">{event.event_date}{event.is_hidden && <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-500 text-white">非表示</span>}</div>
              <div className="col-span-5">
                <Link href={`/admin/edit/${event.id}`} className={`text-sm font-medium hover:underline ${event.is_hidden ? 'text-gray-500' : 'text-gray-900'}`}>{event.title}</Link>
                {event.category && <span className="ml-2 px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded border border-teal-100">{event.category}</span>}
              </div>
              <div className="col-span-1 text-center text-sm font-bold text-gray-600">{event.view_count || 0}</div>
              <div className="col-span-4 text-right text-sm font-medium flex justify-end items-center gap-4">
                {isSuperAdmin && <button onClick={() => onToggleHidden(event.id, event.is_hidden, event.poster_id, event.title)} className={`${event.is_hidden ? 'text-blue-600' : 'text-gray-400'} whitespace-nowrap`}>{event.is_hidden ? '公開' : '非公開'}</button>}
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