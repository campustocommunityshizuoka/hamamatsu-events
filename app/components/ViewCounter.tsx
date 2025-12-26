'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ViewCounter({ eventId }: { eventId: number }) {
  // 二重カウント防止のためのフラグ
  const hasCounted = useRef(false);

  useEffect(() => {
    if (hasCounted.current) return;

    const increment = async () => {
      // SupabaseのRPC（関数）を呼び出す
      const { error } = await supabase.rpc('increment_view_count', {
        row_id: eventId
      });
      if (error) console.error('Count error:', error);
    };

    increment();
    hasCounted.current = true;
  }, [eventId]);

  return null; // 画面には何も表示しない（機能だけの部品）
}