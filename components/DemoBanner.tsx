import { isDemoMode } from "@/lib/data";

export default function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      Website đang chạy dữ liệu minh họa
    </div>
  );
}
