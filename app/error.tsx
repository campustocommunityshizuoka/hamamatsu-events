'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-10 text-center bg-white min-h-screen text-black">
      <h2 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h2>
      <p className="bg-gray-100 p-4 rounded mb-4 text-left font-mono text-sm break-all">
        {error.message}
      </p>
      <button
        onClick={() => reset()}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        もう一度試す
      </button>
    </div>
  );
}