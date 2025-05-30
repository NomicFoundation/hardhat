import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterVersionsByRange } from "../src/internal/solc-versions.js";

// TODO: replace these with actual tests, or drop the entire file
describe("solc-versions", () => {
  it("should filter versions by range", async () => {
    const result = await filterVersionsByRange(["0.8.17", "0.4.25"], ">=0.5.0");

    assert.deepEqual(result, ["0.8.17"]);
  });
});
