// Edge Runtimeを指定（これがないとビルドエラーになるため必須）
export const runtime = 'edge';

export default function Home() {
  return (
    <div style={{ padding: '50px', fontSize: '24px', fontWeight: 'bold' }}>
      <h1>更新テスト成功！</h1>
      <p>この画面が見えれば、デプロイ設定は正常です。</p>
    </div>
  );
}