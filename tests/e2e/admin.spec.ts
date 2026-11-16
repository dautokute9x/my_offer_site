import { expect, test } from "@playwright/test";

// Chế độ demo (không có Supabase env).
for (const path of ["/admin", "/admin/login"]) {
  test(`demo: ${path} báo chưa kết nối Supabase`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByText("Chưa kết nối Supabase — xem README để thiết lập")).toBeVisible();
    await expect(page.locator("input[type=password]")).toHaveCount(0);
  });
}

test("GET /admin/logout không đăng xuất (405)", async ({ request }) => {
  expect((await request.get("/admin/logout")).status()).toBe(405);
});
