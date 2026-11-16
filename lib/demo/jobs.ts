import type { ContentField, InterviewEvent, Job } from "@/lib/types";
import { jstDateKey, jstToIso } from "../time.ts";

const DAY = 86_400_000;
const FIELDS: ContentField[] = ["summary", "description", "requirements", "workingHours", "holidays", "overtime", "benefitsNote"];

type Spec = {
  id: number; code: string; slug: string; titleVi: string; titleJa: string; employerName?: string;
  loc: string; prefs: number[]; occs: number[]; skills?: number[]; benefits?: string[];
  monthly?: [number, number | null]; annual?: [number | null, number | null]; negotiable?: boolean | null;
  jp?: Job["jpLevel"]; exp?: number | null; ageDays: number; status?: Job["status"]; tr?: Job["translationStatus"];
  sparse?: boolean; validDays?: number;
};

// Nội dung hư cấu, chỉ để minh họa giao diện.
const SPECS: Spec[] = [
  { id: 1, code: "00412", slug: "ky-su-thiet-ke-dien-nha-may", titleVi: "Kỹ sư thiết kế điện nhà máy", titleJa: "工場電気設備設計エンジニア", employerName: "Công ty minh họa A", loc: "東京都品川区（デモ）", prefs: [13], occs: [2, 3], skills: [1, 5], benefits: ["ky-tuc-xa", "thuong", "phu-cap-di-lai"], monthly: [300000, 420000], annual: [4_500_000, 6_000_000], jp: "N3", exp: 2, ageDays: 1 },
  { id: 2, code: "26833", slug: "thiet-ke-dien-ha-tang-toa-nha", titleVi: "Thiết kế điện hạ tầng tòa nhà", titleJa: "ビル電気設備設計", loc: "兵庫県神戸市（デモ）", prefs: [28], occs: [2], skills: [1], benefits: ["ky-tuc-xa", "dua-gia-dinh"], annual: [3_640_000, 4_410_000], negotiable: true, jp: "N3", exp: 2, ageDays: 2 },
  { id: 3, code: "10587", slug: "ky-su-thi-cong-dien-cong-trinh", titleVi: "Kỹ sư thi công điện công trình", titleJa: "電気工事技術者", loc: "大阪府大阪市（デモ）", prefs: [27], occs: [1, 12], benefits: ["ho-tro-nha-o", "ho-tro-chung-chi", "dao-tao"], monthly: [280000, 350000], jp: "N2", exp: 3, ageDays: 3 },
  { id: 4, code: "31095", slug: "giam-sat-thi-cong-xay-dung-dan-dung", titleVi: "Giám sát thi công xây dựng dân dụng", titleJa: "土木施工管理", employerName: "Công ty minh họa B", loc: "愛知県名古屋市（デモ）", prefs: [23], occs: [5, 10], benefits: ["ky-tuc-xa", "ho-tro-chuyen-nha", "thuong"], monthly: [320000, 400000], annual: [5_000_000, 6_500_000], jp: "N2", exp: 5, ageDays: 4 },
  { id: 5, code: "47120", slug: "ky-su-thi-cong-cau-duong", titleVi: "Kỹ sư thi công cầu đường", titleJa: "橋梁施工技術者", loc: "福岡県福岡市（デモ）", prefs: [40], occs: [8, 5], benefits: ["ho-tro-nha-o", "dao-tao"], annual: [4_800_000, null], jp: "N3", exp: 3, ageDays: 6 },
  { id: 6, code: "58201", slug: "quan-ly-thi-cong-kien-truc", titleVi: "Quản lý thi công kiến trúc", titleJa: "建築施工管理", loc: "神奈川県横浜市（デモ）", prefs: [14], occs: [9], benefits: ["ky-tuc-xa", "ho-tro-chung-chi", "phu-cap-di-lai"], monthly: [330000, null], jp: "N2", exp: 4, ageDays: 5 },
  { id: 7, code: "62344", slug: "quan-ly-thi-cong-duong-ong", titleVi: "Quản lý thi công đường ống", titleJa: "管工事施工管理", loc: "埼玉県さいたま市（デモ）", prefs: [11], occs: [11], benefits: ["thuong", "dao-tao"], monthly: [290000, 360000], jp: "N3", exp: 2, ageDays: 8 },
  { id: 8, code: "73018", slug: "cad-operator-ban-ve-kien-truc", titleVi: "CAD operator bản vẽ kiến trúc", titleJa: "建築CADオペレーター", loc: "東京都新宿区（デモ）", prefs: [13], occs: [13, 14], skills: [1, 2, 6], benefits: ["dao-tao", "phu-cap-di-lai"], monthly: [250000, 310000], jp: "N4", exp: 1, ageDays: 2 },
  { id: 9, code: "84765", slug: "bim-modeler-ket-cau-thep", titleVi: "BIM modeler kết cấu thép", titleJa: "鉄骨BIMモデラー", loc: "千葉県千葉市（デモ）", prefs: [12], occs: [14, 16], skills: [2, 3, 7], benefits: ["ky-tuc-xa", "ho-tro-chuyen-nha"], annual: [4_200_000, 5_200_000], jp: null, exp: null, ageDays: 9 },
  { id: 10, code: "95402", slug: "ky-su-thiet-ke-co-khi-may-cong-nghiep", titleVi: "Kỹ sư thiết kế cơ khí máy công nghiệp", titleJa: "産業機械設計", employerName: "Công ty minh họa C", loc: "静岡県浜松市（デモ）", prefs: [22], occs: [15], skills: [4, 8, 9], benefits: ["ky-tuc-xa", "dua-gia-dinh", "thuong"], monthly: [310000, 430000], annual: [5_000_000, 7_000_000], jp: "N2", exp: 3, ageDays: 7 },
  { id: 11, code: "10933", slug: "bao-tri-thiet-bi-day-chuyen-san-xuat", titleVi: "Bảo trì thiết bị dây chuyền sản xuất", titleJa: "生産設備保全", loc: "愛知県豊田市（デモ）", prefs: [23], occs: [17, 4], benefits: ["ky-tuc-xa", "ho-tro-nha-o", "phu-cap-di-lai"], monthly: [260000, 330000], jp: "N4", exp: 1, ageDays: 10, tr: "unreviewed" },
  { id: 12, code: "21876", slug: "van-hanh-may-gia-cong-cnc", titleVi: "Vận hành máy gia công CNC", titleJa: "CNC機械オペレーター", loc: "広島県広島市（デモ）", prefs: [34], occs: [18, 19], benefits: ["ky-tuc-xa", "dao-tao"], monthly: [240000, 300000], jp: "none", exp: 0, ageDays: 12 },
  { id: 13, code: "39150", slug: "kiem-tra-chat-luong-san-pham", titleVi: "Kiểm tra chất lượng sản phẩm", titleJa: "製品検査", loc: "北海道札幌市（デモ）", prefs: [1], occs: [20], benefits: ["ho-tro-chuyen-nha"], ageDays: 15, sparse: true },
  { id: 14, code: "40671", slug: "ky-su-thi-cong-lat-duong-da-dong", titleVi: "Kỹ sư thi công trải mặt đường (đã đóng)", titleJa: "舗装工事技術者", loc: "大阪府堺市（デモ）", prefs: [27], occs: [6], monthly: [270000, 340000], jp: "N3", exp: 2, ageDays: 30, status: "closed" },
  { id: 15, code: "50388", slug: "thiet-ke-ket-cau-nha-xuong", titleVi: "Thiết kế kết cấu nhà xưởng", titleJa: "工場建屋構造設計", loc: "東京都江東区（デモ）", prefs: [13, 14], occs: [16, 7], skills: [1, 2], benefits: ["ky-tuc-xa", "ho-tro-chung-chi"], annual: [4_600_000, 5_800_000], negotiable: true, jp: "N3", exp: 3, ageDays: 11, validDays: 60 },
];

function toJob(s: Spec, now: Date): Job {
  const updatedAt = new Date(now.getTime() - s.ageDays * DAY).toISOString();
  const text = (ja: string, vi: string) => (s.sparse ? { ja: null, vi: null } : { ja, vi: s.tr === "unreviewed" ? `${vi} (bản dịch chưa duyệt)` : vi });
  const body: Record<ContentField, { ja: string | null; vi: string | null }> = {
    summary: text("デモ用の架空求人です。", "Tin minh họa hư cấu, không phải tuyển dụng thật."),
    description: text("設計・施工・保全などの業務を担当します。", "Phụ trách thiết kế, thi công hoặc bảo trì theo chuyên môn."),
    requirements: text("関連分野の学歴または実務経験。", "Có bằng cấp hoặc kinh nghiệm thực tế trong lĩnh vực liên quan."),
    workingHours: text("9:00〜18:00（休憩60分）", "9:00–18:00 (nghỉ 60 phút)"),
    holidays: text("土日祝、年末年始", "Thứ Bảy, Chủ Nhật, ngày lễ, nghỉ Tết dương lịch"),
    overtime: text("月平均20時間程度", "Trung bình khoảng 20 giờ/tháng"),
    benefitsNote: text("社会保険完備。", "Có đầy đủ bảo hiểm xã hội."),
  };
  for (const f of FIELDS) if (s.sparse && f !== "summary") body[f] = { ja: null, vi: null };
  return {
    id: s.id, code: s.code, slug: s.slug, status: s.status ?? "published", isDemo: true,
    publishedAt: updatedAt, updatedAt,
    validThrough: s.validDays ? new Date(now.getTime() + s.validDays * DAY).toISOString() : null,
    titleVi: s.titleVi, titleJa: s.titleJa, employerName: s.employerName ?? null, locationDetailJa: s.loc,
    prefectureIds: s.prefs, occupationIds: s.occs, skillIds: s.skills ?? [],
    benefits: Object.fromEntries((s.benefits ?? []).map((b) => [b, true])),
    monthlyMinYen: s.monthly?.[0] ?? null, monthlyMaxYen: s.monthly?.[1] ?? null,
    annualMinYen: s.annual?.[0] ?? null, annualMaxYen: s.annual?.[1] ?? null,
    salaryNegotiable: s.negotiable ?? null, salarySourceText: s.sparse ? null : "デモ用の金額",
    jpLevel: s.jp ?? null, jpNote: null, experienceYearsMin: s.exp ?? null, experienceNote: null,
    driverLicenseRequired: s.sparse ? null : false, companyCarProvided: s.sparse ? null : false,
    content: body, translationStatus: s.tr ?? (s.sparse ? "none" : "approved"),
  };
}

// [jobId, ngày so với hôm nay JST, status]
const SLOTS: [number, number, InterviewEvent["status"]][] = [
  [1, 2, "scheduled"], [1, 5, "scheduled"], [1, 9, "scheduled"],
  [2, 14, "scheduled"], [3, 20, "scheduled"], [4, 5, "scheduled"],
  [8, -3, "scheduled"], [10, 9, "cancelled"], [11, 14, "scheduled"],
];

export function buildDemoJobs(now: Date): { jobs: Job[]; interviews: InterviewEvent[] } {
  const base = new Date(`${jstDateKey(now.toISOString())}T00:00:00Z`);
  const interviews = SLOTS.map(([jobId, d, status], i): InterviewEvent => {
    const key = new Date(base.getTime() + d * DAY).toISOString().slice(0, 10);
    return {
      id: i + 1, jobId, startsAt: jstToIso(key, "10:00"), endsAt: jstToIso(key, "11:00"),
      format: i % 2 ? "onsite" : "online", publicNote: null, status,
    };
  });
  return { jobs: SPECS.map((s) => toJob(s, now)), interviews };
}
