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
const input = "mt-1 min-h-11 w-full rounded border border-slate-300 px-2";

export default async function InterviewSchedulePage({ searchParams }: Props) {
  const f = await parse(await searchParams);
  const { catalog } = f;
  const events = await listUpcomingInterviews(f);
  const days = Map.groupBy(events, (e) => jstDateKey(e.startsAt));
  const group = (summary: string, name: string, items: { value: string; label: string }[], sel: string[]) => (
    <details open={sel.length > 0} className="rounded border border-slate-300 bg-white">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold text-navy">
        {summary}{sel.length > 0 && ` (${sel.length})`}
      </summary>
      <div className="max-h-56 overflow-y-auto px-3 pb-2">
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Lịch phỏng vấn</h1>
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
        <label className="text-sm font-semibold">Từ ngày (JST)
          <input type="date" name="tu" defaultValue={f.from} className={input} />
        </label>
        <label className="text-sm font-semibold">Đến ngày (JST)
          <input type="date" name="den" defaultValue={f.to} className={input} />
        </label>
        {group("Tỉnh / thành", "tinh", catalog.prefectures.map((p) => ({ value: p.code, label: p.nameVi })), f.prefectures)}
        {group("Nghề", "nghe", catalog.occupations.map((o) => ({ value: o.slug, label: o.nameVi })), f.occupations)}
        <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="min-h-11 rounded bg-brand px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176AC0]">Lọc</button>
          <Link href="/lich-phong-van" className="inline-flex min-h-11 items-center px-3 font-semibold text-brand">Xóa lọc</Link>
        </div>
      </form>
      <p className="text-sm text-slate-700">Đăng ký quan tâm không đồng nghĩa giữ suất phỏng vấn.</p>
      {events.length === 0 ? (
        <p>Chưa có lịch phỏng vấn phù hợp. <Link href="/lich-phong-van" className="font-semibold text-brand underline">Xem tất cả lịch</Link></p>
      ) : (
        <TimezoneToggle>
          {[...days].map(([key, list]) => (
            <section key={key} aria-labelledby={`d-${key}`}>
              <h2 id={`d-${key}`} className="mb-2 text-lg font-bold text-navy">{dayHeading(key)}</h2>
              <ul className="space-y-2">
                {list.map((e) => (
                  <li key={e.id} className="rounded border border-warn/40 bg-orange-50 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <p className="font-semibold text-warn">{formatJst(e.startsAt).split(" · ")[1]}</p>
                      <p className="hidden text-sm group-data-[vn=true]:block">= {formatVn(e.startsAt)}</p>
                      <p className="mt-1 font-semibold"><Link href={jobHref(e.job)} className="text-brand underline">{e.job.titleVi}</Link></p>
                      <p className="text-sm">
                        Mã {e.job.code} · {catalog.prefectures.filter((p) => e.job.prefectureIds.includes(p.id)).map((p) => p.nameVi).join(", ") || "Chưa xác nhận"} · {FORMAT[e.format]}
                      </p>
                    </div>
                    <Link href={`${jobHref(e.job)}#ung-tuyen`} className="mt-2 inline-flex min-h-11 items-center rounded bg-brand px-4 font-semibold text-white sm:mt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176AC0]">Đăng ký quan tâm</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </TimezoneToggle>
      )}
    </div>
  );
}
