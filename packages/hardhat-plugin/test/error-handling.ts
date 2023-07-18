/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("module error handling", () => {
  useEphemeralIgnitionProject("minimal-new-api");

  it("should error on passing async callback", async function () {
    await assert.isRejected(
      this.deploy(
        defineModule("AsyncModule", (async () => {
          return {};
        }) as any)
      ),
      /The callback passed to 'defineModule' for AsyncModule returns a Promise; async callbacks are not allowed in 'defineModule'./
    );
  });

  it("should error on module throwing an exception", async function () {
    await assert.isRejected(
      this.deploy(
        defineModule("AsyncModule", () => {
          throw new Error("User thrown error");
        })
      ),
      /User thrown error/
    );
  });
});
