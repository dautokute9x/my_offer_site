export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải" className="grid grid-cols-1 border-t-4 border-ink">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-36 border-b border-rule bg-paper-2 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
