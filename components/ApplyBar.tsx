import type { Job } from "@/lib/types";

const cls = "inline-flex min-h-11 items-center justify-center rounded bg-brand px-6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176AC0]";

// Task 10 gắn form vào #ung-tuyen.
export function ApplyButton({ job }: { job: Pick<Job, "code"> }) {
  return <a href="#ung-tuyen" className={cls} aria-label={`Ứng tuyển tin ${job.code}`}>Ứng tuyển</a>;
}

export default function ApplyBar({ job }: { job: Pick<Job, "code" | "titleVi"> }) {
  return (
    <div data-apply-bar className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2 lg:hidden">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">#{job.code} {job.titleVi}</span>
      <ApplyButton job={job} />
    </div>
  );
}
