import { UNCONFIRMED } from "@/lib/salary";
import type { Tri } from "@/lib/types";

export default function TriValue({ value, yes = "Có", no = "Không" }: { value: Tri | undefined; yes?: string; no?: string }) {
  if (value === true) return <span className="font-semibold text-ok">✓ {yes}</span>;
  if (value === false) return <span className="text-slate-700">✗ {no}</span>;
  return <span className="text-slate-600">{UNCONFIRMED}</span>;
}
