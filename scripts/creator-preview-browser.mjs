import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, devices } from "playwright";

await fs.mkdir("artifacts/creator-preview", { recursive: true });
const browser = await chromium.launch({ headless: true });
const modes = [
  { name: "mobile", context: { ...devices["iPhone 13"], browserName: undefined } },
  { name: "desktop", context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }
];
try {
  for (const mode of modes) {
    const context = await browser.newContext(mode.context);
    const page = await context.newPage();
    const errors = [];
    const failedNetwork = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("response", (response) => { if (response.status() >= 400) failedNetwork.push(response.status() + " " + response.url().slice(0,140)); });
    const response = await page.goto("http://127.0.0.1:3100/creator-preview", { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, mode.name + ": app should load");
    await page.getByRole("heading", { name: /every story starts/i }).waitFor();
    await page.getByLabel("Your idea").fill("The original healer story for hydration check");
    const nextStepButton = page.getByRole("button", { name: /Preview next steps/i });
    await nextStepButton.waitFor();
    await nextStepButton.click({ timeout: 25000 }).catch(() => {
      throw new Error(mode.name + " interactive create never hydrated. " + JSON.stringify({errors,failedNetwork,consoleErrors}));
    });
    await page.getByText(/Your idea is ready for a story outline/i).waitFor();
    const mainNav = page.getByRole("navigation", {
      name: mode.name === "mobile" ? "Creator preview mobile navigation" : "Creator preview sections"
    });
    const nav = async (label) => {
      await mainNav.getByRole("button", { name: new RegExp(label + "$") }).click();
    };
    await page.screenshot({ path: "artifacts/creator-preview/" + mode.name + "-create.png", fullPage: true });

    await nav("Story");
    await page.screenshot({ path: "artifacts/creator-preview/" + mode.name + "-after-story-click.png", fullPage: true });
    console.log("DEBUG", mode.name, "headings", await page.locator("h1,h2").allTextContents(), "pageerrors", errors, "failed", failedNetwork, "console", consoleErrors);
    await page.getByRole("heading", { name: /make every moment/i }).waitFor({ timeout: 12000 });
    await page.getByRole("button", { name: "Advanced" }).click();
    await page.getByLabel("Describe the moment").fill("The mentor reveals a difficult truth");
    await page.getByRole("button", { name: /Add story seed/i }).click();
    await page.getByText("The mentor reveals a difficult truth").waitFor();
    await page.screenshot({ path: "artifacts/creator-preview/" + mode.name + "-story.png", fullPage: true });

    await nav("Cast");
    await page.getByText(/deterministic sample, not a connected AI chatbot/i).waitFor();
    const privateSelection = page.getByRole("button", { name: /^Private/ });
    assert.equal(await privateSelection.getAttribute("aria-pressed"), "true", "private by default");
    await page.screenshot({ path: "artifacts/creator-preview/" + mode.name + "-cast.png", fullPage: true });

    await nav("Coins");
    await page.getByText(/no generation or credit charge can be triggered/i).waitFor();
    await page.screenshot({ path: "artifacts/creator-preview/" + mode.name + "-coins.png", fullPage: true });

    await nav("Watch");
    await page.getByRole("heading", { name: /find a world worth/i }).waitFor();
    await page.screenshot({ path: "artifacts/creator-preview/" + mode.name + "-watch.png", fullPage: true });

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    assert.ok(dimensions.document <= dimensions.viewport + 1, mode.name + ": horizontal overflow " + JSON.stringify(dimensions));
    assert.deepEqual(errors, [], mode.name + " browser page errors: " + errors.join(", "));
    console.log("PASS", mode.name, "story/cast/watch/coins navigation, no overflow, no page errors");
    await context.close();
  }
} finally {
  await browser.close();
}
