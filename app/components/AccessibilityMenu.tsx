'use client';

import { useState, useEffect } from 'react';

type Props = {
  textToRead: string; // 読み上げる文章
};

export default function AccessibilityMenu({ textToRead }: Props) {
  const [isLargeText, setIsLargeText] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speech, setSpeech] = useState<SpeechSynthesisUtterance | null>(null);

  // 文字サイズの切り替え
  useEffect(() => {
    const html = document.documentElement;
    if (isLargeText) {
      html.style.fontSize = '125%'; // 基準を25%大きくする（Tailwindのrem計算全体に効く）
    } else {
      html.style.fontSize = '100%'; // 元に戻す
    }
  }, [isLargeText]);

  // 読み上げのセットアップ
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(textToRead);
      u.lang = 'ja-JP'; // 日本語設定
      u.rate = 0.9;     // 少しゆっくり話す
      u.pitch = 1;

      // 読み上げ終了時の処理
      u.onend = () => setIsSpeaking(false);
      setSpeech(u);
    }
    
    // クリーンアップ（ページ移動時などに停止）
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [textToRead]);

  const toggleSpeech = () => {
    if (!speech) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.speak(speech);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
      {/* 文字サイズ変更ボタン */}
      <button
        onClick={() => setIsLargeText(!isLargeText)}
        className="bg-white border-2 border-teal-700 text-teal-800 rounded-full w-14 h-14 flex flex-col items-center justify-center shadow-lg hover:bg-teal-50 transition-transform active:scale-95"
        aria-label="文字サイズ変更"
      >
        <span className="text-xs font-bold leading-none">文字</span>
        <span className="text-xl font-black leading-none">{isLargeText ? '小' : '大'}</span>
      </button>

      {/* 読み上げボタン */}
      <button
        onClick={toggleSpeech}
        className={`${
          isSpeaking ? 'bg-orange-500 text-white' : 'bg-white text-orange-600'
        } border-2 border-orange-500 rounded-full w-14 h-14 flex flex-col items-center justify-center shadow-lg hover:brightness-95 transition-transform active:scale-95`}
        aria-label={isSpeaking ? '読み上げ停止' : '読み上げ開始'}
      >
        <span className="text-2xl">{isSpeaking ? '⏹️' : '🔊'}</span>
        <span className="text-[10px] font-bold">{isSpeaking ? '停止' : '聞く'}</span>
      </button>
    </div>
  );
}