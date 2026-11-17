"use client";
import { useI18n } from "@/lib/i18n/client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="border-t-4 border-error py-10">
      <p className="display-face text-[length:var(--text-title)]">{t.jobs.list.error}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">{t.jobs.list.retry}</button>
    </div>
  );
}
