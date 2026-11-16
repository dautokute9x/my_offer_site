import { expect, test } from "@playwright/test";
import { buildDemoJobs } from "@/lib/demo/jobs";

const jobs = buildDemoJobs(new Date()).jobs;
const find = (pred: (j: (typeof jobs)[number]) => boolean) => {
  const j = jobs.find(pred);
  if (!j) throw new Error("demo data thiếu tin mẫu");
  return `/viec-lam/${j.slug}-${j.code}`;
};

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
  await page.goto(find((j) => j.status === "closed"));
  await expect(page.getByText("Đã ngừng tuyển")).toBeVisible();
  await expect(page.getByRole("link", { name: /Ứng tuyển/ })).toHaveCount(0);
  await expect(page.locator("#ung-tuyen")).toHaveCount(0);
});

test("tin thiếu lương → mục lương ghi 'Chưa xác nhận'", async ({ page }) => {
  await page.goto(find((j) => j.status === "published" && [j.monthlyMinYen, j.monthlyMaxYen, j.annualMinYen, j.annualMaxYen].every((v) => v == null)));
  const salary = page.getByRole("region", { name: "Lương & thu nhập" });
  await expect(salary).toContainText("Tháng: Chưa xác nhận");
  await expect(salary).toContainText("Năm: Chưa xác nhận");
});

test("bản dịch chưa duyệt → có nhãn; tin đã duyệt → không có", async ({ page }) => {
  await page.goto(find((j) => j.translationStatus === "unreviewed"));
  await expect(page.getByText("Bản dịch chưa được duyệt").first()).toBeVisible();
  await page.goto(find((j) => j.translationStatus === "approved" && j.status === "published"));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Bản dịch chưa được duyệt")).toHaveCount(0);
});
