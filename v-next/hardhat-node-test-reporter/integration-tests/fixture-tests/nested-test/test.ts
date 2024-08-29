import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("level 0", () => {
  describe("level 1", () => {
    describe("level 2", () => {
      it("nested test", async () => {
        assert.equal(1, 1);
      });

      it("assertion error in nested test", async () => {
        assert.equal(1, 2);
      });

      it("error with cause in nested test", async () => {
        throw new Error("error with cause", {
          cause: new Error("cause"),
        });
      });
    });
  });
});
