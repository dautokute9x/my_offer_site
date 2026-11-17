import Link from "next/link";

export const metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <section>
      <h1 className="text-[length:var(--text-display-s)]">Không tìm thấy trang</h1>
      <p className="standfirst mt-6">Trang bạn tìm không tồn tại hoặc đã được chuyển đi.</p>
      <Link href="/viec-lam" className="btn btn-primary mt-8">
        Xem danh sách việc làm
      </Link>
    </section>
  );
}
