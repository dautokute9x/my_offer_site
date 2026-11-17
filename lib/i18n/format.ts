/** Điền biến vào chuỗi dịch: fmt("Tìm thấy {n} việc làm", { n: 3 }). Biến không có thì giữ nguyên "{tên}" để dễ phát hiện. */
export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
