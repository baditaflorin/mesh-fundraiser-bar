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

// Bidirectional: contributions from BOTH peers must aggregate into the shared
// total on both screens. Catches a regression where one peer's writes land in
// a different Y.Map (or only local useState) and never reach the other peer.
test("contributions from both peers aggregate on both screens", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("amount").fill("25");
    await a.getByRole("button", { name: "+ add", exact: true }).click();

    // B contributes too — the OPPOSITE direction from the first test.
    await b.getByPlaceholder("your name").fill("bob");
    await b.getByPlaceholder("amount").fill("75");
    await b.getByRole("button", { name: "+ add", exact: true }).click();

    // Both peers must show the combined 25 + 75 = 100 total and both names.
    await expect(a.locator(".fund-total")).toContainText("$100");
    await expect(b.locator(".fund-total")).toContainText("$100");
    await expect(a.locator(".fund-entry-name")).toContainText(["bob"]);
    await expect(b.locator(".fund-entry-name")).toContainText(["alice"]);
  } finally {
    await cleanup();
  }
});

// Deletion must also propagate: removing a contribution on A drops the total
// on B back down. Proves contribs.delete() crosses the mesh, not just .set().
test("removing a contribution on A lowers the total on B", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("amount").fill("40");
    await a.getByRole("button", { name: "+ add", exact: true }).click();

    await expect(b.locator(".fund-total")).toContainText("$40");
    await expect(b.locator(".fund-entry-name")).toContainText(["alice"]);

    // Remove on A; B must reflect the removal (total back to $0, list empty).
    await a.locator(".fund-entry-rm").first().click();

    await expect(b.locator(".fund-total")).toContainText("$0");
    await expect(b.locator(".fund-empty")).toBeVisible();
  } finally {
    await cleanup();
  }
});
