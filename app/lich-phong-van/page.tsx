import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, getSiteSettings, listUpcomingInterviews } from "@/lib/data";
import { jobHref } from "@/lib/filters";
import { dayHeading, formatJst, formatVn, jstDateKey, parseDateKey } from "@/lib/time";
import TimezoneToggle from "@/components/TimezoneToggle";

type SP = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<SP> };

// Chấp nhận tham số lặp lại (checkbox) lẫn dấu phẩy; giá trị ngoài danh sách bị bỏ.
const multi = (v: SP[string], allowed: Set<string>) =>
  [...new Set([v ?? []].flat().flatMap((x) => x.split(",")).map((x) => x.trim()).filter((x) => allowed.has(x)))];

async function parse(sp: SP) {
  const c = await getCatalog();
  return {
    from: parseDateKey(sp.tu), to: parseDateKey(sp.den),
    prefectures: multi(sp.tinh, new Set(c.prefectures.map((p) => p.code))),
    occupations: multi(sp.nghe, new Set(c.occupations.map((o) => o.slug))),
    catalog: c,
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = await parse(await searchParams);
  const { brandName } = await getSiteSettings();
  const filtered = f.from || f.to || f.prefectures.length || f.occupations.length;
  return {
    title: { absolute: `Lịch phỏng vấn | ${brandName}` },
    alternates: { canonical: "/lich-phong-van" },
    ...(filtered && { robots: { index: false, follow: true } }),
  };
}

const FORMAT = { online: "Online", onsite: "Trực tiếp", unknown: "Hình thức: Chưa xác nhận" };
const input = "field mt-1";

export default async function InterviewSchedulePage({ searchParams }: Props) {
  const f = await parse(await searchParams);
  const { catalog } = f;
  const events = await listUpcomingInterviews(f);
  const days = Map.groupBy(events, (e) => jstDateKey(e.startsAt));
  const group = (summary: string, name: string, items: { value: string; label: string }[], sel: string[]) => (
    <details open={sel.length > 0} className="border border-rule-2 bg-paper">
      <summary className="flex min-h-12 cursor-pointer items-center px-3 text-sm font-semibold text-ink">
        {summary}{sel.length > 0 && ` (${sel.length})`}
      </summary>
      <div className="max-h-56 overflow-y-auto px-3 pb-2 accent-ink">
        {items.map((i) => (
          <label key={i.value} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={i.value} defaultChecked={sel.includes(i.value)} />
            {i.label}
          </label>
        ))}
      </div>
    </details>
  );
  return (
    <div className="space-y-12">
      <header className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <h1 className="text-[length:var(--text-display-s)] lg:col-span-7">Lịch phỏng vấn</h1>
        <p className="standfirst lg:col-span-5 lg:self-end">Giờ ghi theo giờ Nhật. Đăng ký quan tâm không đồng nghĩa giữ suất phỏng vấn.</p>
      </header>
      <form method="get" className="well grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
        <label className="text-sm font-semibold text-ink">Từ ngày (JST)
          <input type="date" name="tu" defaultValue={f.from} className={input} />
        </label>
        <label className="text-sm font-semibold text-ink">Đến ngày (JST)
          <input type="date" name="den" defaultValue={f.to} className={input} />
        </label>
        <div className="sm:pt-6">{group("Tỉnh / thành", "tinh", catalog.prefectures.map((p) => ({ value: p.code, label: p.nameVi })), f.prefectures)}</div>
        <div className="sm:pt-6">{group("Nghề", "nghe", catalog.occupations.map((o) => ({ value: o.slug, label: o.nameVi })), f.occupations)}</div>
        <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn btn-primary">Lọc</button>
          <Link href="/lich-phong-van" className="btn">Xóa lọc</Link>
        </div>
      </form>
      {events.length === 0 ? (
        <p className="prose-body">Chưa có lịch phỏng vấn phù hợp. <Link href="/lich-phong-van" className="link font-semibold text-ink">Xem tất cả lịch</Link></p>
      ) : (
        <TimezoneToggle>
          <div className="space-y-12">
            {[...days].map(([key, list]) => (
              <section key={key} aria-labelledby={`d-${key}`} className="grid gap-4 border-t-4 border-ink pt-4 lg:grid-cols-12 lg:gap-8">
                <h2 id={`d-${key}`} className="text-[length:var(--text-title)] lg:col-span-3">{dayHeading(key)}</h2>
                <ul className="lg:col-span-9">
                  {list.map((e) => (
                    <li key={e.id} className="grid gap-x-6 gap-y-2 border-b border-rule py-4 first:pt-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center">
                      <div>
                        <p className="display-face text-2xl leading-none text-accent">{formatJst(e.startsAt).split(" · ")[1]?.split(" ")[0]}</p>
                        <p className="mt-1 text-xs text-muted">{formatJst(e.startsAt).split(" · ")[1]?.split(" ").slice(1).join(" ")}</p>
                        <p className="hidden text-xs text-muted group-data-[vn=true]:block">= {formatVn(e.startsAt)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="display-face text-[length:var(--text-title)] leading-tight"><Link href={jobHref(e.job)} className="link">{e.job.titleVi}</Link></p>
                        <p className="mt-1 text-sm text-muted">
                          Mã {e.job.code}, {catalog.prefectures.filter((p) => e.job.prefectureIds.includes(p.id)).map((p) => p.nameVi).join(", ") || "Chưa xác nhận"}, {FORMAT[e.format]}
                        </p>
                      </div>
                      <Link href={`${jobHref(e.job)}#ung-tuyen`} className="btn justify-self-start">Đăng ký quan tâm</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </TimezoneToggle>
      )}
    </div>
  );
}
