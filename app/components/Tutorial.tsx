'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

type TutorialProps = {
  run: boolean;
  onClose: () => void;
  isAdmin: boolean;
};

export default function Tutorial({ run, onClose, isAdmin }: TutorialProps) {
  useEffect(() => {
    if (run) {
      const steps = [
        { 
          element: '#tutorial-header', 
          popover: { 
            title: 'マイページへようこそ', 
            description: 'ここでは投稿の管理や、運営からのお知らせを確認できます。',
            side: "bottom" as const,
            align: 'start' as const
          } 
        },
        { 
          element: '#tutorial-mail', 
          popover: { 
            title: 'メッセージ機能', 
            description: 'ここから「お知らせ（受信）」の確認や、運営への「メッセージ送信」ができます。未読がある場合はバッジがつきます。',
            side: "bottom" as const
          } 
        },
        { 
          element: '#tutorial-create-btn', 
            popover: { 
            title: 'イベント作成', 
            description: 'ここから新しいイベントを投稿できます。',
            side: "bottom" as const
          } 
        },
        ...(isAdmin ? [
          { 
            element: '#tutorial-report', 
            popover: { 
              title: '通報・報告', 
              description: '【管理者機能】ユーザーからの通報内容はここで確認・対応できます。',
              side: "bottom" as const
            } 
          },
          { 
            element: '#tutorial-application', 
            popover: { 
              title: '新規申請', 
              description: '【管理者機能】新しい団体の利用申請はここに届きます。',
              side: "bottom" as const
            } 
          }
        ] : []),
        { 
          element: '#tutorial-profile', 
          popover: { 
            title: 'プロフィール設定', 
            // ★変更: HPのURLについて言及
            description: 'アイコン、名前、団体のホームページURLの設定はこちらから行えます。',
            side: "left" as const
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