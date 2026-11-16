"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-white p-6 text-center">
      <p className="font-semibold text-navy">Không tải được danh sách việc làm. Vui lòng thử lại.</p>
      <button onClick={reset} className="mt-3 min-h-11 rounded bg-brand px-5 font-semibold text-white">Thử lại</button>
    </div>
  );
}
