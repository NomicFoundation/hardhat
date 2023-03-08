/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import { IDeploymentBuilder } from "types/deploymentGraph";

describe("deployment builder - metadata", () => {
  it("should inject the chainId via the builder", () => {
    const chainIdModule = buildModule("chainId", (m: IDeploymentBuilder) => {
      if (m.chainId === 42) {
        return {};
      }

      assert.fail("Chain id was not injected");
    });

    generateDeploymentGraphFrom(chainIdModule, { chainId: 42, accounts: [] });
  });

  it("should inject the accounts via the builder", () => {
    const accountsModule = buildModule("accounts", (m: IDeploymentBuilder) => {
      if (m.accounts[0] === "0x1" && m.accounts[1] === "0x2") {
        return {};
      }

      assert.fail("Chain id was not injected");
    });

    generateDeploymentGraphFrom(accountsModule, {
      chainId: 42,
      accounts: ["0x1", "0x2"],
    });
  });
});
