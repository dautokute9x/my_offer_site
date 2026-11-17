import { jobTitle } from "@/lib/i18n/catalog";
import Image from "next/image";
import Link from "next/link";
import { countOpenJobsByGroup, getCatalog, getSiteSettings, listUpcomingInterviews, searchJobs } from "@/lib/data";
import { jobHref, parseFilters } from "@/lib/filters";
import { PHOTOS, type Photo } from "@/lib/photos";
import { salaryLines } from "@/lib/salary";
import { formatJst } from "@/lib/time";
import { isPlaceholder } from "@/lib/site-defaults";
import { catalogName, prefectureName } from "@/lib/i18n/catalog";
import { languageAlternates, localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { lang } = await getT();
  return { alternates: { canonical: localePath(lang, "/"), languages: languageAlternates("/") } };
}

export const dynamic = "force-dynamic"; // lịch phỏng vấn phụ thuộc thời điểm hiện tại

// Ảnh minh họa cho từng nhóm nghề (chỉ nhóm có ảnh phù hợp); nhóm khác là ô màu.
const GROUP_PHOTO: Record<string, Photo> = { dien: PHOTOS["bo-mach"], "xay-dung": PHOTOS["may-xuc"] };
const JAPAN: [Photo, "capTokyo" | "capKyoto" | "capKanna"][] = [
  [PHOTOS.tokyo, "capTokyo"],
  [PHOTOS.kyoto, "capKyoto"],
  [PHOTOS["bao-go"], "capKanna"],
];
const split = "grid gap-8 lg:grid-cols-12 lg:gap-8";

function Print({ photo, className = "", sizes, priority }: { photo: Photo; className?: string; sizes: string; priority?: boolean }) {
  return (
    <div data-slot className={`photo overflow-hidden ${className}`}>
      <Image src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} sizes={sizes} priority={priority} />
    </div>
  );
}

export default async function Home() {
  const [catalog, { lang, t }] = await Promise.all([getCatalog(), getT()]);
  const h = t.home, p = (path: string) => localePath(lang, path);
  const [{ items, total }, events, counts, s] = await Promise.all([
    searchJobs(parseFilters({}, catalog)),
    listUpcomingInterviews({ prefectures: [], occupations: [] }),
    countOpenJobsByGroup(),
    getSiteSettings(),
  ]);
  const place = (ids: number[]) => catalog.prefectures.filter((x) => ids.includes(x.id)).map((x) => prefectureName(lang, x)).join(", ") || t.common.unconfirmed;
  const words = catalog.occupations.map((o) => catalogName(lang, t, "occupations", o));
  return (
    <div className="space-y-[var(--section-gap-s)]">
      {/* Hero kiểu Stage: chữ bên trái, một bản in nghiêng của công việc bên phải, số tin đang tuyển đóng dấu ở góc. */}
      <section aria-labelledby="hero" className="grid items-center gap-14 lg:min-h-[calc(100dvh-11rem)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <h1 id="hero" className="max-w-[12ch] text-[clamp(3.25rem,6.5vw+0.5rem,7rem)] leading-[0.92]">{h.title}</h1>
          <p className="standfirst mt-6">{h.lead}</p>
          <form action={p("/viec-lam")} method="get" className="mt-8 grid max-w-xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-sm font-medium text-ink sm:col-span-2">{h.keyword}
              <input name="q" type="search" placeholder={h.keywordPlaceholder} className="field mt-1" />
            </label>
            <label className="text-sm font-medium text-ink">{h.group}
              <select name="nhom" defaultValue="" className="field mt-1">
                <option value="">{h.allGroups}</option>
                {catalog.groups.map((g) => <option key={g.slug} value={g.slug}>{catalogName(lang, t, "groups", g)}</option>)}
              </select>
            </label>
            <button className="btn btn-primary self-end">{h.search}</button>
          </form>
        </div>
        <div className="relative pb-10 lg:col-span-6 lg:pl-6">
          <Print photo={PHOTOS["cop-pha"]} className="tilt-r aspect-[4/3]" sizes="(min-width: 1024px) 45vw, 100vw" priority />
          <Link href={p("/viec-lam")} className="well band-a absolute bottom-0 left-0 block px-5 py-3 no-underline transition-colors duration-150 hover:bg-paper-2 lg:left-0">
            <span className="display-face block text-[clamp(2.5rem,4vw,3.75rem)] leading-none">{total}</span>
            <span className="block text-sm font-medium">{h.openJobsStamp}</span>
          </Link>
        </div>
      </section>

      {/* Dải chữ chạy: tên các nghề trong danh mục (dừng khi rê chuột, tắt khi người dùng giảm chuyển động). */}
      <div className="marquee-track -mx-[var(--gutter)] overflow-hidden border-y-2 border-ink bg-paper-2 py-4" aria-label={h.marqueeLabel}>
        <div className="marquee">
          {[0, 1].map((k) => (
            <ul key={k} aria-hidden={k === 1 || undefined} className="flex shrink-0 gap-[var(--space-2xl)]">
              {words.map((w) => <li key={w} className="display-face whitespace-nowrap text-3xl">{w}</li>)}
            </ul>
          ))}
        </div>
      </div>

      <section aria-labelledby="moi" className={split}>
        <div className="lg:col-span-4">
          <h2 id="moi" className="text-[length:var(--text-display-s)]">{h.latest}</h2>
          <Link href={p("/viec-lam")} className="btn mt-8">{h.seeAllJobs}</Link>
        </div>
        <ol className="border-t-2 border-accent-2 lg:col-span-8">
          {items.slice(0, 6).map((j) => {
            const { monthly, annual } = salaryLines(j, t.salary);
            return (
              <li key={j.id} className="group relative grid grid-cols-[6rem_minmax(0,1fr)] gap-x-5 gap-y-1 border-b-2 border-accent-2/30 py-5 transition-colors duration-150 hover:bg-paper-2 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,13rem)]">
                <span className="display-face text-2xl leading-tight">#{j.code}</span>
                <div className="min-w-0">
                  <h3 className="text-[length:var(--text-title)] leading-tight">
                    <Link href={p(jobHref(j))} className="link decoration-transparent after:absolute after:inset-0 group-hover:decoration-accent-2">{jobTitle(lang, j)}</Link>
                  </h3>
                  <p className="mt-1 text-sm text-muted">{place(j.prefectureIds)}</p>
                </div>
                <p className="col-start-2 text-sm font-medium tabular-nums sm:col-start-3">{monthly || annual || h.salaryUnconfirmed}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Số liệu thật lấy từ dữ liệu đang có; họa tiết chấm ở một góc, không nằm dưới chữ. */}
      <section aria-labelledby="so-lieu" className="band-a relative -mx-[var(--gutter)] overflow-hidden px-[var(--gutter)] py-[var(--section-gap-s)]">
        <div aria-hidden="true" className="halftone absolute right-0 top-0 h-56 w-72 opacity-60 [mask-image:linear-gradient(to_bottom_left,black,transparent_75%)]" />
        <div className="relative mx-auto max-w-[calc(var(--container)-2*var(--gutter))]">
          <h2 id="so-lieu" className="text-[length:var(--text-display-s)]">{h.figuresTitle}</h2>
          <dl className="mt-12 grid gap-8 border-t-2 border-ink pt-8 sm:grid-cols-3 sm:gap-0">
            {([[total, h.figOpenJobs], [catalog.groups.length, h.figGroups], [events.length, h.figInterviews]] as const).map(([n, label], i) => (
              <div key={label} className={`flex flex-col-reverse ${i > 0 ? "sm:border-l-2 sm:border-ink sm:pl-8" : ""}`}>
                <dt className="mt-2 text-base font-medium">{label}</dt>
                <dd className="display-face text-[clamp(4rem,9vw,8.5rem)] leading-[0.85]">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="nhom">
        <h2 id="nhom" className="text-[length:var(--text-display-s)]">{h.groups}</h2>
        <ul className="mt-12 grid gap-8 md:grid-cols-6 lg:grid-cols-12">
          {catalog.groups.map((g, i) => {
            const photo = GROUP_PHOTO[g.slug];
            const span = i === 0 ? "md:col-span-6 lg:col-span-7" : i === 1 ? "md:col-span-6 lg:col-span-5" : "md:col-span-2 lg:col-span-4";
            return (
              <li key={g.slug} className={span}>
                <Link href={p(`/viec-lam?nhom=${g.slug}`)} className="group flex h-full flex-col gap-4 no-underline">
                  {photo ? (
                    <Print photo={photo} className={`aspect-[16/10] ${i % 2 ? "tilt-r" : "tilt-l"}`} sizes="(min-width: 1024px) 50vw, 100vw" />
                  ) : (
                    <span aria-hidden="true" className={`well block p-6 ${i % 2 ? "" : "bg-paper-3"}`}>
                      <span className="display-face block text-[clamp(4rem,7vw,6rem)] leading-[0.85]">{counts[g.slug] ?? 0}</span>
                    </span>
                  )}
                  <span className="flex items-baseline justify-between gap-4">
                    <span>
                      <span className="display-face block text-[length:var(--text-title)] leading-tight underline decoration-transparent decoration-2 underline-offset-4 transition-colors duration-150 group-hover:decoration-accent-2">{catalogName(lang, t, "groups", g)}</span>
                      <span lang="ja" className="mt-1 block text-sm text-muted">{g.nameJa}</span>
                    </span>
                    <span className="display-face whitespace-nowrap text-[length:var(--text-title)] tabular-nums">{fmt(h.jobsCount, { n: counts[g.slug] ?? 0 })}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="nhat-ban" className={split}>
        <div className="lg:col-span-3">
          <h2 id="nhat-ban" className="text-[length:var(--text-display-s)]">{h.japan}</h2>
          <p className="standfirst mt-6">{h.japanLead}</p>
        </div>
        <ul className="grid gap-10 sm:grid-cols-3 sm:gap-6 lg:col-span-9">
          {JAPAN.map(([photo, caption], i) => (
            <li key={photo.src}>
              <figure>
                <Print photo={photo} className={`aspect-[4/5] ${i === 1 ? "tilt-r sm:mt-12" : "tilt-l"}`} sizes="(min-width: 640px) 30vw, 100vw" />
                <figcaption className="mt-4 text-sm font-medium">{h[caption]}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pv" className={split}>
        <div className="lg:col-span-4">
          <h2 id="pv" className="text-[length:var(--text-display-s)]">{h.upcoming}</h2>
          <Link href={p("/lich-phong-van")} className="btn mt-8">{h.seeSchedule}</Link>
        </div>
        {events.length === 0 ? <p className="prose-body lg:col-span-8 lg:border-t-2 lg:border-accent-2 lg:pt-4">{h.noInterviews}</p> : (
          <ul className="border-t-2 border-accent-2 lg:col-span-8">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="grid gap-x-6 gap-y-1 border-b-2 border-accent-2/30 py-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                <p className="font-bold text-accent-2">{formatJst(e.startsAt, t.dates)}</p>
                <Link href={p(jobHref(e.job))} className="link font-medium text-ink">{jobTitle(lang, e.job)}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="qt">
        <h2 id="qt" className="text-[length:var(--text-display-s)]">{h.process}</h2>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {h.steps.map(([st, d], i) => (
            <li key={st} className={`well flex flex-col p-6 ${i % 2 ? "bg-paper-3" : ""}`}>
              <span className="display-face block text-[length:var(--text-display)] leading-none tabular-nums">{i + 1}</span>
              <span className="display-face mt-6 block text-[length:var(--text-title)] leading-tight">{st}</span>
              <span className="mt-2 block">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gt" className={`${split} items-center`}>
        <div className="lg:col-span-5">
          <Print photo={PHOTOS["trung-tam-du-lieu"]} className="tilt-l aspect-[3/2]" sizes="(min-width: 1024px) 40vw, 100vw" />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <h2 id="gt" className="text-[length:var(--text-display-s)]">{h.about}</h2>
          <p className="standfirst mt-6 max-w-[38ch] text-[length:var(--text-xl)] leading-snug">{isPlaceholder(s.aboutText) || lang !== "vi" ? fmt(h.aboutFallback, { brand: s.brandName }) : s.aboutText.split(/\n\s*\n/)[0]}</p>
          <Link href={p("/gioi-thieu")} className="btn mt-8">{h.learnMore}</Link>
        </div>
      </section>

      <section aria-labelledby="faq" className={split}>
        <div className="lg:col-span-4">
          <h2 id="faq" className="text-[length:var(--text-display-s)]">{h.faq}</h2>
        </div>
        <div className="border-t-2 border-accent-2 lg:col-span-8">
          {h.faqs.map(([q, a]) => (
            <details key={q} className="group border-b-2 border-accent-2/30">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-lg font-bold text-ink">
                {q}
                <span aria-hidden="true" className="display-face text-3xl text-accent-2 transition-transform duration-150 group-open:rotate-45">+</span>
              </summary>
              <p className="prose-body pb-6">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
