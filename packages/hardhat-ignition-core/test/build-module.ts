/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../src/build-module";

describe("buildModule", () => {
  describe("error handling", () => {
    it("should error on passing async callback", async function () {
      assert.throws(
        () => buildModule("AsyncModule", (async () => {}) as any),
        /The callback passed to 'buildModule' for AsyncModule returns a Promise; async callbacks are not allowed in 'buildModule'./
      );
    });

    it("should error on module throwing an exception", async function () {
      assert.throws(
        () =>
          buildModule("AsyncModule", () => {
            throw new Error("User thrown error");
          }),
        /User thrown error/
      );
    });
  });
});
