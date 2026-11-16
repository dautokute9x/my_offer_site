// Tách đoạn theo dòng trống; chỉ render văn bản thuần (React tự escape).
export default function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i) => (
        <p key={i} className={className}>{p}</p>
      ))}
    </>
  );
}
