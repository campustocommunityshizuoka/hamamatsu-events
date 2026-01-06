'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

type TutorialProps = {
  run: boolean;
  onClose: () => void;
  isAdmin: boolean; // ★追加: 管理者かどうか
};

export default function Tutorial({ run, onClose, isAdmin }: TutorialProps) {
  useEffect(() => {
    if (run) {
      // ステップ定義
      // 各オブジェクトの side や align に as const を付けてリテラル型にします
      const steps = [
        { 
          element: '#tutorial-header', 
          popover: { 
            title: 'マイページへようこそ', 
            description: 'ここでは投稿の管理や、運営からのお知らせを確認できます。',
            side: "bottom" as const,  // ★修正
            align: 'start' as const   // ★修正
          } 
        },
        { 
          element: '#tutorial-mail', 
          popover: { 
            title: 'メッセージ機能', 
            description: 'ここから「お知らせ（受信）」の確認や、運営への「メッセージ送信」ができます。未読がある場合はバッジがつきます。',
            side: "bottom" as const   // ★修正
          } 
        },
        { 
          element: '#tutorial-create-btn', 
            popover: { 
            title: 'イベント作成', 
            description: 'ここから新しいイベントを投稿できます。',
            side: "bottom" as const   // ★修正
          } 
        },
        // ★変更: 管理者の場合のみ配列に追加する
        ...(isAdmin ? [
          { 
            element: '#tutorial-report', 
            popover: { 
              title: '通報・報告', 
              description: '【管理者機能】ユーザーからの通報内容はここで確認・対応できます。',
              side: "bottom" as const // ★修正
            } 
          },
          { 
            element: '#tutorial-application', 
            popover: { 
              title: '新規申請', 
              description: '【管理者機能】新しい団体の利用申請はここに届きます。',
              side: "bottom" as const // ★修正
            } 
          }
        ] : []),
        { 
          element: '#tutorial-profile', 
          popover: { 
            title: 'プロフィール設定', 
            description: 'アイコンや名前の変更はこちらから行えます。',
            side: "left" as const     // ★修正
          } 
        },
      ];

      const driverObj = driver({
        showProgress: true,
        animate: true,
        nextBtnText: '次へ',
        prevBtnText: '戻る',
        doneBtnText: '完了',
        onDestroyed: onClose,
        steps: steps 
      });

      driverObj.drive();
    }
  }, [run, onClose, isAdmin]);

  return null;
}