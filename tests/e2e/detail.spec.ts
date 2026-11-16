import { expect, test } from "@playwright/test";

test("mở trực tiếp tin 00412 → tiêu đề đúng", async ({ page }) => {
  await page.goto("/viec-lam/ky-su-thiet-ke-dien-nha-may-00412");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kỹ sư thiết kế điện nhà máy");
});

test("slug sai → 308 về URL chuẩn", async ({ page }) => {
  const res = await page.request.get("/viec-lam/sai-slug-00412", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toContain("/viec-lam/ky-su-thiet-ke-dien-nha-may-00412");
  await page.goto("/viec-lam/sai-slug-00412");
  await expect(page).toHaveURL(/\/viec-lam\/ky-su-thiet-ke-dien-nha-may-00412$/);
});

test("mã không tồn tại → 404", async ({ page }) => {
  const res = await page.request.get("/viec-lam/khong-co-99999", { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test("tin đã đóng → 'Đã ngừng tuyển', không có nút ứng tuyển", async ({ page }) => {
  await page.goto("/viec-lam/ky-su-thi-cong-lat-duong-da-dong-40671");
  await expect(page.getByText("Đã ngừng tuyển")).toBeVisible();
  await expect(page.getByRole("link", { name: /Ứng tuyển/ })).toHaveCount(0);
  await expect(page.locator("#ung-tuyen")).toHaveCount(0);
});

test("tin thiếu lương → 'Chưa xác nhận'", async ({ page }) => {
  await page.goto("/viec-lam/kiem-tra-chat-luong-san-pham-39150");
  await expect(page.getByText("Chưa xác nhận").first()).toBeVisible();
});

test("bản dịch chưa duyệt → có nhãn", async ({ page }) => {
  await page.goto("/viec-lam/bao-tri-thiet-bi-day-chuyen-san-xuat-10933");
  await expect(page.getByText("Bản dịch chưa được duyệt").first()).toBeVisible();
});
