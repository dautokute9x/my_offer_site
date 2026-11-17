export type Tri = boolean | null;
export type JpLevel = "N1" | "N2" | "N3" | "N4" | "N5" | "none";

export type Prefecture = {
  id: number;
  code: string;
  nameJa: string;
  nameVi: string;
  romaji: string;
  region: string;
  aliases: string[];
};
export type OccupationGroup = { id: number; slug: string; nameVi: string; nameJa: string; sort: number };
export type Occupation = {
  id: number;
  groupId: number;
  slug: string;
  nameVi: string;
  nameJa: string;
  aliases: string[];
};
export type Skill = { id: number; name: string; aliases: string[] };
export type Benefit = {
  id: number;
  slug: string;
  nameVi: string;
  nameJa: string;
  featured: boolean;
  sort: number;
};

export type InterviewEvent = {
  id: number;
  jobId: number;
  startsAt: string;
  endsAt: string | null;
  format: "online" | "onsite" | "unknown";
  publicNote: string | null;
  status: "scheduled" | "cancelled";
};

// Lịch phỏng vấn kèm phần tin mà trang lịch / trang chủ dùng (upcoming_interviews trả đúng các trường này).
export type InterviewWithJobSummary = InterviewEvent & {
  job: Pick<Job, "id" | "code" | "slug" | "status" | "isDemo" | "titleVi" | "titleJa" | "prefectureIds" | "occupationIds">;
};

export type ContentField =
  | "summary"
  | "description"
  | "requirements"
  | "workingHours"
  | "holidays"
  | "overtime"
  | "benefitsNote";

export type Job = {
  id: number;
  code: string;
  slug: string;
  status: "draft" | "published" | "closed";
  isDemo: boolean;
  publishedAt: string | null;
  updatedAt: string;
  validThrough: string | null;
  titleVi: string;
  titleJa: string;
  employerName: string | null;
  locationDetailJa: string;
  prefectureIds: number[];
  occupationIds: number[];
  skillIds: number[];
  benefits: Record<string, boolean>;
  monthlyMinYen: number | null;
  monthlyMaxYen: number | null;
  annualMinYen: number | null;
  annualMaxYen: number | null;
  salaryNegotiable: Tri;
  salarySourceText: string | null;
  jpLevel: JpLevel | null;
  jpNote: string | null;
  experienceYearsMin: number | null;
  experienceNote: string | null;
  driverLicenseRequired: Tri;
  companyCarProvided: Tri;
  content: Record<ContentField, { ja: string | null; vi: string | null }>;
  translationStatus: "none" | "unreviewed" | "approved";
};

export type Catalog = {
  prefectures: Prefecture[];
  groups: OccupationGroup[];
  occupations: Occupation[];
  skills: Skill[];
  benefits: Benefit[];
};
