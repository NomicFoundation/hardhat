import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { buildModule } from "../src/build-module.js";

describe("buildModule", () => {
  describe("error handling", () => {
    it("should error on passing async callback", async function () {
      assertThrowsHardhatError(
        () => buildModule("AsyncModule", (async () => {}) as any),
        HardhatError.ERRORS.IGNITION.MODULE.ASYNC_MODULE_DEFINITION_FUNCTION,
        {
          moduleDefinitionId: "AsyncModule",
        },
      );
    });

    it("should error on module throwing an exception", async function () {
      assert.throws(
        () =>
          buildModule("AsyncModule", () => {
            throw new Error("User thrown error");
          }),
        /User thrown error/,
      );
    });
  });
});
