/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";

describe("deployment builder - buildModule", () => {
  it("should throw if build module is given an async callback", () => {
    assert.throws(() => {
      const badAsyncModule = buildModule("BadAsyncModule", (async () => {
        return {};
      }) as any);

      return generateDeploymentGraphFrom(badAsyncModule, {
        chainId: 31337,
      });
    }, /The callback passed to 'buildModule' for BadAsyncModule returns a Promise; async callbacks are not allowed in 'buildModule'./);
  });

  it("should throw if build module throws an exception", () => {
    assert.throws(() => {
      const badAsyncModule = buildModule("BadAsyncModule", () => {
        throw new Error("User thrown error");
      });

      return generateDeploymentGraphFrom(badAsyncModule, {
        chainId: 31337,
      });
    }, /User thrown error/);
  });
});
