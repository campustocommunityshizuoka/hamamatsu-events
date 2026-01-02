'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ReportButton({ eventId }: { eventId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return alert('理由を入力してください');
    if (!confirm('この内容で通報しますか？')) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          event_id: eventId,
          reason: reason
        });

      if (error) throw error;

      alert('通報を受け付けました。ご協力ありがとうございます。');
      setIsOpen(false);
      setReason('');
    } catch (e) {
      console.error(e);
      alert('送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-gray-400 text-sm hover:text-red-600 underline"
      >
        ⚠️ 不適切な投稿として報告
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800">通報フォーム</h3>
            <p className="text-sm text-gray-600 mb-2">この投稿が不適切であると思われる理由を教えてください。</p>
            <textarea
              className="w-full border border-gray-300 rounded p-2 mb-4 h-32"
              placeholder="例：無関係な広告、不快なコンテンツ、詐欺の疑いなど..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                キャンセル
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? '送信中...' : '通報する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}