export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải" className="grid grid-cols-1 border-t-2 border-accent-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-36 border-b-2 border-accent-2/30 bg-paper-2 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
