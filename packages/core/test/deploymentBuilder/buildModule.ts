/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/buildModule";
import { IgnitionError } from "../../src/errors";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import { ProcessResultKind } from "../../src/types/process";

describe("deployment builder - buildModule", () => {
  it("should return an error if build module is given an async callback", () => {
    const badAsyncModule = buildModule("BadAsyncModule", (async () => {
      return {};
    }) as any);

    const result = generateDeploymentGraphFrom(badAsyncModule, {
      chainId: 31337,
      accounts: [],
      artifacts: [],
    });

    assert.deepStrictEqual(result, {
      _kind: ProcessResultKind.FAILURE,
      message: "Deployment graph construction failed",
      failures: [
        new IgnitionError(
          "The callback passed to 'buildModule' for BadAsyncModule returns a Promise; async callbacks are not allowed in 'buildModule'."
        ),
      ],
    });
  });

  it("should return error if build module throws an exception", () => {
    const badAsyncModule = buildModule("BadAsyncModule", () => {
      throw new IgnitionError("User thrown error");
    });

    const result = generateDeploymentGraphFrom(badAsyncModule, {
      chainId: 31337,
      accounts: [],
      artifacts: [],
    });

    assert.deepStrictEqual(result, {
      _kind: ProcessResultKind.FAILURE,
      message: "Deployment graph construction failed",
      failures: [new IgnitionError("User thrown error")],
    });
  });
});
