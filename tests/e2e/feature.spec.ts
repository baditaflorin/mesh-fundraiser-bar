import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("contribution from A increments total on B", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("amount").fill("25");
    await a.getByRole("button", { name: "+ add", exact: true }).click();

    await expect(b.locator(".fund-total")).toContainText("$25");
    await expect(b.locator(".fund-entry-name")).toContainText(["alice"]);
  } finally {
    await cleanup();
  }
});

test("goal set on A shows percentage on B", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByRole("button", { name: "set goal", exact: true }).click();
    await a.getByPlaceholder("goal amount").fill("100");
    await a.locator(".fund-edit").getByRole("button", { name: "save", exact: true }).click();

    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("amount").fill("50");
    await a.getByRole("button", { name: "+ add", exact: true }).click();

    await expect(b.locator(".fund-goal")).toContainText("50%");
  } finally {
    await cleanup();
  }
});
