'use client';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl max-w-lg w-full border-t-8 border-orange-500">
        <div className="text-6xl mb-6">🚧</div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
          ただいまメンテナンス中です
        </h1>
        <p className="text-gray-600 leading-relaxed mb-6">
          現在、システムの調整を行っております。<br/>
          ご不便をおかけしますが、しばらく経ってから再度アクセスしてください。
        </p>
        <p className="text-sm text-gray-400">
          Administrator is working on updates.
        </p>
      </div>
    </div>
  );
}