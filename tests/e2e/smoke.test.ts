import { expect, test } from "../fixtures";

test.describe("Mr. Ranedeer Edexcel GCSE Maths Voice Tutor", () => {
  test("loads dashboard, switches multi-lens explanations on Compound Interest, and saves /config", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Understand tricky GCSE Maths/i })
    ).toBeVisible();

    // Open Compound Interest & Growth (Edexcel R16)
    await page
      .getByRole("link", { name: /Compound Interest & Growth/i })
      .first()
      .click();

    await expect(
      page.getByRole("heading", { name: /Compound Interest & Growth/i })
    ).toBeVisible();

    // Rotate lens using "Explain It Another Way"
    await page.getByRole("button", { name: /Explain It Another Way/i }).click();

    await expect(page.getByText(/2\/5 Ways Explored/i)).toBeVisible();

    // Navigate to /settings (/config & Reminders)
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /Daily Practice Reminders/i })
    ).toBeVisible();
  });
});
