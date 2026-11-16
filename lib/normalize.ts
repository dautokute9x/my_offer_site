export function normText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

export function normCode(s: string): string {
  return normText(s).replace(/^#/, "").replace(/\s+/g, "");
}
