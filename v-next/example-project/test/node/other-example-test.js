import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "@ignored/hardhat-vnext";

describe("Other example test", async () => {
  const taskName = await new Promise((resolve) =>
    setTimeout(resolve, "example"),
  );

  it("should have the example task", () => {
    assert.ok(hre.tasks.getTask(taskName));
  });
});
