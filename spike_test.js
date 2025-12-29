import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // スパイクテスト用のステージ設定
  stages: [
    { duration: '10s', target: 100 },  // 最初の10秒で100人まで増やす
    { duration: '20s', target: 1000 }, // 次の20秒で一気に1,000人へ！ (ここがスパイク)
    { duration: '30s', target: 1000 }, // 30秒間その高負荷を維持
    { duration: '10s', target: 0 },    // 最後に10秒で0人に戻す
  ],
};

export default function () {
  // Cloudflare対策のヘッダー
  const params = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  };

  // トップページにアクセス
  const res = http.get('https://hamamtsu-events.shizuoka-connect.com', params);

  // 成功判定
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // リロード連打に近い動き（0.5〜1.5秒間隔）
  sleep(Math.random() * 1 + 0.5);
}