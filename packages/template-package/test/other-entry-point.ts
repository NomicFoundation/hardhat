import { describe, it } from "node:test";
import * as assert from "node:assert";
import { one } from "../src/other-entry-point.js";

describe("Other entry point tests", () => {
  it("Should return one", () => {
    assert.equal(one(), 1);
  });
});
