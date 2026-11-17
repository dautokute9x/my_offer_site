import { isDemoMode } from "@/lib/data";

export default function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div role="status" className="border-b border-rule bg-paper-3 px-4 py-2 text-center text-sm text-ink">
      Website đang chạy dữ liệu minh họa
    </div>
  );
}
