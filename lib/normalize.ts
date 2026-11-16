export function normText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    // Chỉ dải dấu tổ hợp La-tinh; không mở rộng sang \p{M} (sẽ làm mất dakuten của kana).
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

export function normCode(s: string): string {
  return normText(s).replace(/^#/, "").replace(/\s+/g, "");
}
