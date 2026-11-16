import type { Metadata } from "next";
import PolicyDraftBanner from "@/components/PolicyDraftBanner";
import { getSiteSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Chính sách bảo mật", alternates: { canonical: "/chinh-sach-bao-mat" } };

export default async function Page() {
  const { policiesConfirmed, retentionMonths } = await getSiteSettings();
  return (
    <article className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-navy">Chính sách bảo mật</h1>
      {!policiesConfirmed && <PolicyDraftBanner />}
      <h2 className="text-lg font-bold text-navy">Mục đích xử lý hồ sơ</h2>
      <p>Thông tin bạn gửi (họ tên, liên hệ, hồ sơ ứng tuyển) chỉ được dùng để tư vấn, giới thiệu việc làm và liên hệ về các tin bạn quan tâm.</p>
      <h2 className="text-lg font-bold text-navy">Thời hạn lưu</h2>
      <p>Hồ sơ được lưu tối đa {retentionMonths} tháng kể từ lần liên hệ gần nhất, sau đó sẽ bị xóa hoặc ẩn danh.</p>
      <h2 className="text-lg font-bold text-navy">Quyền yêu cầu xóa</h2>
      <p>Bạn có quyền yêu cầu xem, sửa hoặc xóa thông tin của mình bất cứ lúc nào qua trang Liên hệ.</p>
    </article>
  );
}
