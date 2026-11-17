import { expect, test } from "@playwright/test";

const PAGES = ["/", "/viec-lam", "/viec-lam/ky-su-thiet-ke-dien-nha-may-00412", "/lich-phong-van"];
const WIDTHS = [360, 390, 768, 1024, 1440];

for (const path of PAGES) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      // Đợi nội dung thật (không đo skeleton loading).
      await expect(path === "/viec-lam" ? page.locator("article").first() : page.getByRole("heading", { level: 1 })).toBeVisible();
      const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, i: window.innerWidth }));
      expect(w.s, `${path} @${width}`).toBeLessThanOrEqual(w.i);
    }
  });
}

test("390px: Bộ lọc mở dialog, chọn tỉnh, Xem kết quả → URL có tinh=", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/viec-lam");
  await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Tokyo (東京都)").check();
  await dialog.getByRole("button", { name: /^Xem \d+ kết quả/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/tinh=13/);
});

for (const width of [390, 1280]) {
  test(`bàn phím (${width}px): Tab tới ô tìm kiếm trong ≤30 lần, gõ, Enter → URL có q=`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/viec-lam");
    await expect(page.getByRole("searchbox", { name: "Tìm kiếm" })).toBeVisible(); // đợi hết skeleton loading
    const focused = () => page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.name === "q");
    let n = 0;
    while (!(await focused()) && n++ < 30) await page.keyboard.press("Tab");
    expect(await focused(), "Tab tới được ô tìm kiếm trong 30 lần").toBe(true);
    await page.keyboard.type("dien");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/q=dien/);
  });
}

test("liên kết bỏ qua: Tab đầu tiên → skip link, Enter → focus vào #main", async ({ page }) => {
  await page.goto("/viec-lam");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Bỏ qua đến nội dung chính" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("lịch phỏng vấn hiện giờ Nhật (JST, UTC+9)", async ({ page }) => {
  await page.goto("/lich-phong-van");
  await expect(page.getByRole("region").getByText("giờ Nhật (JST, UTC+9)").first()).toBeVisible();
});

test("skip link khi focus không đẩy bố cục", async ({ page }) => {
  await page.goto("/viec-lam");
  const h1 = page.getByRole("heading", { level: 1 });
  const before = (await h1.boundingBox())!.y;
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Bỏ qua đến nội dung chính" })).toBeFocused();
  expect((await h1.boundingBox())!.y).toBe(before);
});
