import { expect, test, type Page } from "@playwright/test";
import { buildDemoJobs } from "@/lib/demo/jobs";
import { demoCatalog } from "@/lib/demo/catalog";

const total = async (page: Page) => Number((await page.getByText(/Tìm thấy \d+ việc làm/).innerText()).match(/\d+/)![0]);
const cardCodes = async (page: Page) =>
  (await page.locator("article").allInnerTexts()).map((t) => /#(\d{5})/.exec(t)![1]);

test("gõ #00412 vào ô tìm → thẻ đầu tiên là #00412", async ({ page }) => {
  await page.goto("/viec-lam");
  await page.getByRole("searchbox", { name: "Tìm kiếm" }).fill("#00412");
  await page.getByRole("button", { name: "Tìm", exact: true }).click();
  await expect(page).toHaveURL(/q=%2300412/);
  await expect(page.locator("article").first()).toContainText("#00412");
});

test("lọc 2 tỉnh + 1 nhóm nghề → URL có tinh=, nhom= và mọi thẻ thuộc điều kiện", async ({ page }) => {
  await page.goto("/viec-lam");
  await page.getByLabel("Tokyo (東京都)").check();
  await page.getByLabel("Osaka (大阪府)").check();
  await page.getByLabel("Điện và thiết kế điện (cả nhóm)").check();
  await expect(page).toHaveURL(/tinh=13%2C27/);
  await expect(page).toHaveURL(/nhom=dien/);

  // Tập mã mong đợi tính độc lập từ dữ liệu demo (tin đang mở, Tokyo/Osaka, nghề thuộc nhóm "dien").
  const pref = demoCatalog.prefectures.filter((p) => ["13", "27"].includes(p.code)).map((p) => p.id);
  const group = demoCatalog.groups.find((g) => g.slug === "dien")!.id;
  const occ = demoCatalog.occupations.filter((o) => o.groupId === group).map((o) => o.id);
  const expected = buildDemoJobs(new Date()).jobs
    .filter((j) => j.status === "published" && j.prefectureIds.some((p) => pref.includes(p)) && j.occupationIds.some((o) => occ.includes(o)))
    .map((j) => j.code);
  expect(expected.length).toBeGreaterThan(0);
  await expect(page.locator("article")).toHaveCount(expected.length);
  const codes = await cardCodes(page);
  expect(codes.length).toBeGreaterThan(0);
  for (const c of codes) expect(expected).toContain(c);
});

test("Xóa tất cả → tổng kết quả bằng lúc đầu", async ({ page }) => {
  await page.goto("/viec-lam");
  const status = page.getByText(/Tìm thấy \d+ việc làm/);
  const initial = await total(page);
  await page.getByLabel("Tokyo (東京都)").check();
  await expect(page).toHaveURL(/tinh=13/);
  await expect(status).not.toHaveText(`Tìm thấy ${initial} việc làm`);
  await page.getByRole("link", { name: "Xóa tất cả" }).click();
  await expect(page).toHaveURL(/\/viec-lam$/);
  await expect(page.getByText(`Tìm thấy ${initial} việc làm`)).toBeVisible();
});

test("vào chi tiết rồi goBack → URL và số kết quả giữ nguyên", async ({ page }) => {
  await page.goto("/viec-lam?tinh=13");
  const n = await total(page);
  await page.locator("article").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/viec-lam\/[a-z0-9-]+-\d{5}/);
  await page.goBack();
  await expect(page).toHaveURL(/\/viec-lam\?tinh=13$/);
  await expect(page.getByText(/Tìm thấy \d+ việc làm/)).toHaveText(`Tìm thấy ${n} việc làm`);
});

test("?q=zzzkhongco → trạng thái rỗng", async ({ page }) => {
  await page.goto("/viec-lam?q=zzzkhongco");
  await expect(page.getByText("Không tìm thấy việc làm phù hợp")).toBeVisible();
});

test("?demo_error=1 → nút Thử lại", async ({ page }) => {
  await page.goto("/viec-lam?demo_error=1");
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
});

test("?trang=abc → không lỗi", async ({ page }) => {
  const res = await page.goto("/viec-lam?trang=abc");
  expect(res!.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Việc làm kỹ sư tại Nhật" })).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
});
