export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">プライバシーポリシー</h1>
      <p className="mb-4">当団体は、本ウェブサイト上で提供するサービスにおける、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。</p>
      
      <h2 className="text-xl font-bold mt-6 mb-2">第1条（個人情報の利用目的）</h2>
      <p>当団体が個人情報を収集・利用する目的は，以下のとおりです。</p>
      <ul className="list-disc pl-6 mb-4">
        <li>本サービスの提供・運営のため</li>
        <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
        <li>重要なお知らせなど必要に応じたご連絡のため</li>
        <li>不正・不当な目的でサービスを利用しようとするユーザーの特定をし，ご利用をお断りするため</li>
      </ul>

      {/* 必要に応じて条文を追加 */}

      <p className="mt-8 text-sm text-gray-500">2025年●月●日 制定</p>
    </div>
  );
}