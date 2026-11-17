import type { Job } from "@/lib/types";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";

const cls = "btn btn-primary";

// Task 10 gắn form vào #ung-tuyen.
export async function ApplyButton({ job }: { job: Pick<Job, "code"> }) {
  const { t } = await getT();
  return <a href="#ung-tuyen" className={cls} aria-label={fmt(t.detail.applyLabel, { code: job.code })}>{t.detail.apply}</a>;
}

export default function ApplyBar({ job }: { job: Pick<Job, "code" | "titleVi"> }) {
  return (
    <div data-apply-bar className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t-2 border-accent-2 bg-paper px-4 py-2 lg:hidden">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">#{job.code} {job.titleVi}</span>
      <ApplyButton job={job} />
    </div>
  );
}
