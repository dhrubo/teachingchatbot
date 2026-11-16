import { expect, test } from "../fixtures";

test.describe("Mr. Ranedeer Edexcel GCSE Maths — Simplified Topics, Auth, Watcher & No-Cheat Quiz", () => {
  test("loads clean topic screen, switches multi-lens tutorial, opens No-Cheat Quiz, and loads Auth & Watcher Hub", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /Pick a Maths Topic to Learn & Quiz/i,
      })
    ).toBeVisible();

    // Open Step 1: Tutorial on the first topic (Compound Interest & Growth)
    await page
      .getByRole("link", { name: /1\. Tutorial/i })
      .first()
      .click();

    await expect(
      page.getByRole("heading", { name: /Compound Interest/i })
    ).toBeVisible();

    // Rotate lens using "Explain It Another Way"
    await page.getByRole("button", { name: /Explain It Another Way/i }).click();
    await expect(page.getByText(/2\/5 Ways Explored/i)).toBeVisible();

    // Switch to Step 2: No-Cheat Mastery Quiz
    await page
      .getByRole("button", { name: /Step 2: No-Cheat Mastery Quiz/i })
      .click();
    await expect(page.getByText(/No-Cheat Quiz Mode/i)).toBeVisible();

    // Navigate to /login & /guardian
    await page.goto("/login");
    await expect(
      page.getByRole("heading", {
        name: /Student & Parent Watcher Accounts/i,
      })
    ).toBeVisible();

    await page.goto("/guardian");
    await expect(
      page.getByRole("heading", {
        name: /Parent & Guardian Watcher Hub/i,
      })
    ).toBeVisible();

    await page.goto("/chat");
    await expect(
      page.getByRole("heading", {
        name: /Ask & Play Maths Chat/i,
      })
    ).toBeVisible();
    await expect(page.getByText(/Your Mastery Progress/i)).toBeVisible();
  });
});
