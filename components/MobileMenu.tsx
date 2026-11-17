"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Đóng menu khi chuyển trang (header nằm trong root layout nên không bị unmount).
export default function MobileMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);
  return (
    <details ref={ref} className="relative lg:hidden">
      <summary className="btn min-h-11 cursor-pointer list-none">
        Menu
      </summary>
      {children}
    </details>
  );
}
