/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import { IDeploymentBuilder } from "types/deploymentGraph";

describe("deployment builder - chainId", () => {
  it("should inject the chainId via the builder", () => {
    const chainIdModule = buildModule("chainId", (m: IDeploymentBuilder) => {
      if (m.chainId === 42) {
        return {};
      }

      assert.fail("Chain id was not injected");
    });

    generateDeploymentGraphFrom(chainIdModule, { chainId: 42 });
  });
});
