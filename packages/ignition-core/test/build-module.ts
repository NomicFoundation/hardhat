import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrows,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";
import { describe, it } from "node:test";

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
      assertThrows(
        () =>
          buildModule("AsyncModule", () => {
            throw new Error("User thrown error");
          }),
        (e) => /User thrown error/.test(e.message),
      );
    });
  });
});
