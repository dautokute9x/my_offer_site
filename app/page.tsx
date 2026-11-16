import Link from "next/link";

export default function Home() {
  return (
    <section>
      <h1 className="text-3xl font-bold text-navy">Việc làm kỹ sư tại Nhật Bản</h1>
      <Link
        href="/viec-lam"
        className="mt-4 inline-flex min-h-11 items-center rounded bg-brand px-5 font-semibold text-white"
      >
        Xem việc làm
      </Link>
    </section>
  );
}
