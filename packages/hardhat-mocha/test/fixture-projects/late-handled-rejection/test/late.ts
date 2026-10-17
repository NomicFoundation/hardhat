import assert from "node:assert/strict";

describe("late handled rejection", () => {
  it("survives a rejection handled one tick later", async () => {
    const doomed = Promise.reject(new Error("expected revert"));
    await new Promise((r) => setTimeout(r, 10));
    await doomed.catch((e: Error) => {
      assert.equal(e.message, "expected revert");
    });
  });
});
