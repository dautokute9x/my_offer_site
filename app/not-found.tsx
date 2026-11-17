import Link from "next/link";

export const metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-bold text-navy">Không tìm thấy trang</h1>
      <p className="mt-2">Trang bạn tìm không tồn tại hoặc đã được chuyển đi.</p>
      <Link href="/viec-lam" className="mt-4 inline-block text-brand underline">
        Xem danh sách việc làm
      </Link>
    </section>
  );
}
