export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ))}
    </div>
  );
}
