import { UNCONFIRMED } from "@/lib/salary";
import type { Tri } from "@/lib/types";

export default function TriValue({ value, yes = "Có", no = "Không" }: { value: Tri | undefined; yes?: string; no?: string }) {
  if (value === true) return <span className="font-semibold text-success"><span aria-hidden="true">✓</span> {yes}</span>;
  if (value === false) return <span className="text-muted"><span aria-hidden="true">✗</span> {no}</span>;
  return <span className="text-muted">{UNCONFIRMED}</span>;
}
