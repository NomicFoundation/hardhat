/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { deployModule } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("module error handling", () => {
  useEnvironment("minimal");

  it("should error on passing async callback", async function () {
    const promise = deployModule(this.hre, (async () => {
      return {};
    }) as any);

    return assert.isRejected(
      promise,
      /The callback passed to 'buildModule' for MyModule returns a Promise; async callbacks are not allowed in 'buildModule'./
    );
  });
});
