import { expect, test } from "@playwright/test";

// Regression test for the "pasted a big topic list → can't select anything"
// bug. Pasting many topics trips the server chunking pre-processor, which
// returns a short reply and pins the parsed topics. The client then shows a
// full-screen TopicSelectScreen. Clicking a topic must dismiss that screen
// immediately (it used to wait for the model to emit startNewTopicSession, and
// if the model asked a clarifying question instead, the screen stayed up
// forever).

const MANY_TOPICS = `Calculate Fractions all 4 operations- Add, Subtract, Divide & Multiply, Perimeter of shapes, Straight Line Graphs,
Calculate Probabilities, Probability Scale, Simplify Expressions, Solve Equations and Inequalities, Expand and
simplify double brackets, Factorise expressions,
Calculate time, Draw and Interpret bar graphs, Interpret direct proportion graphs
Standard Form, Write in a ratio, Ratio as fractions, Share in a ratio
Convert currencies, Convert metric units, Sequences, Nth term rule, Error Intervals
Write as a percentage, Calculate percentages, Percentage increase & decrease`;

test.describe("Topic select screen", () => {
  test("pasting many topics shows the select screen, and a pick dismisses it", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.getByTestId("multimodal-input").fill(MANY_TOPICS);
    await page.getByTestId("send-button").click();

    // The chunking pre-processor should surface the full-screen topic chooser.
    const screen = page.getByTestId("topic-select-screen");
    await expect(screen).toBeVisible({ timeout: 30_000 });

    const options = page.getByTestId("topic-select-option");
    expect(await options.count()).toBeGreaterThan(1);

    // Picking a topic must dismiss the chooser — deterministically, without
    // depending on the model emitting startNewTopicSession.
    await options.first().click();
    await expect(screen).toBeHidden({ timeout: 15_000 });

    // No duplicate-key React errors should appear during the flow.
    const dupKeyErrors = consoleErrors.filter((e) =>
      e.includes("two children with the same key")
    );
    expect(dupKeyErrors, dupKeyErrors.join("\n")).toHaveLength(0);
  });
});
