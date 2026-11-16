import { expect, test, type Page } from "@playwright/test";

const URL = "/viec-lam/ky-su-thiet-ke-dien-nha-may-00412";
const submit = (page: Page) => page.locator("#ung-tuyen").getByRole("button", { name: "Gửi hồ sơ" });

async function fill(page: Page, contact = true) {
  const form = page.locator("#ung-tuyen");
  await form.getByLabel("Họ và tên").fill("Nguyen Van A");
  if (contact) await form.getByLabel("Điện thoại / Zalo").fill("0912345678");
  await form.getByLabel(/^CV/).setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await form.getByRole("checkbox").check();
}

test("bấm gửi 3 lần → chỉ 1 request; phản hồi 503 báo CHƯA được gửi", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/applications/start", async (route) => {
    requests++;
    await new Promise((r) => setTimeout(r, 1000));
    await route.continue(); // 503 thật từ chế độ demo
  });
  await page.goto(URL);
  await fill(page);
  await submit(page).click();
  // Hai lần gửi nữa trong lúc request đầu còn treo (nút bị khóa + khóa ref).
  await page.locator("#ung-tuyen form").evaluate((f: HTMLFormElement) => { f.requestSubmit(); f.requestSubmit(); });
  await expect(page.getByText(/CHƯA được gửi/)).toBeVisible();
  expect(requests).toBe(1);
  await expect(page.getByText("Đã nhận hồ sơ")).toHaveCount(0);
});

test("không nhập liên hệ → hiện lỗi liên hệ", async ({ page }) => {
  await page.goto(URL);
  await fill(page, false);
  await submit(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "Cần ít nhất một cách liên hệ" })).toBeVisible();
});
