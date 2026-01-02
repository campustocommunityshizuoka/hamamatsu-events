export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">利用規約</h1>
      <p className="mb-4">この利用規約（以下，「本規約」といいます。）は、当サイト（以下，「本サービス」といいます。）の利用条件を定めるものです。</p>
      
      <h2 className="text-xl font-bold mt-6 mb-2">第1条（適用）</h2>
      <p>本規約は、ユーザーと本サービス運営者との間の、本サービスの利用に関わる一切の関係に適用されるものとします。</p>

      <h2 className="text-xl font-bold mt-6 mb-2">第2条（禁止事項）</h2>
      <ul className="list-disc pl-6 mb-4">
        <li>法令または公序良俗に違反する行為</li>
        <li>犯罪行為に関連する行為</li>
        <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
        <li>その他、運営者が不適切と判断する行為</li>
      </ul>

      {/* 必要に応じて条文を追加 */}
      
      <p className="mt-8 text-sm text-gray-500">2025年●月●日 制定</p>
    </div>
  );
}