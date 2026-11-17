"use client";
import { createContext, use, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// Một transition chung cho bộ lọc và sắp xếp để danh sách biết khi nào đang cập nhật.
const Ctx = createContext<{ go: (href: string) => void; pending: boolean }>({ go: () => {}, pending: false });
export const useJobsNav = () => use(Ctx);

export function JobsNav({ className, children }: { className: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (href: string) => start(() => router.push(href, { scroll: false }));
  return <Ctx value={{ go, pending }}><div className={className}>{children}</div></Ctx>;
}

export function JobsResults({ className, children }: { className?: string; children: ReactNode }) {
  const { pending } = useJobsNav();
  return (
    <section aria-busy={pending} className={className}>
      {pending && <p className="text-sm text-slate-600">Đang cập nhật kết quả…</p>}
      {children}
    </section>
  );
}

// Đổi sắp xếp là áp dụng ngay khi có JS; không có JS thì form GET vẫn gửi bằng nút "Tìm".
export function SortSelect({ className, children, defaultValue }: { className: string; children: ReactNode; defaultValue: string }) {
  const { go } = useJobsNav();
  return (
    <select name="sx" defaultValue={defaultValue} className={className}
      onChange={(e) => {
        const qs = new URLSearchParams([...new FormData(e.currentTarget.form!)].filter(([, v]) => v !== "") as [string, string][]);
        go(`/viec-lam?${qs}`);
      }}>
      {children}
    </select>
  );
}
