"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="border-t-4 border-error py-10">
      <p className="display-face text-[length:var(--text-title)]">Không tải được danh sách việc làm. Vui lòng thử lại.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">Thử lại</button>
    </div>
  );
}
