import { RequestArguments, buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useIgnitionProject } from "./test-helpers/use-ignition-project";

describe("support changing default sender", () => {
  useIgnitionProject("minimal");

  it("should deploy on the first HH account by default", async function () {
    const [defaultAccount] = await this.hre.ethers.getSigners();
    const defaultAccountAddress = defaultAccount.address;

    const moduleDefinition = buildModule("Module", (m) => {
      const ownerSender = m.contract("OwnerSender");

      return { ownerSender };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      defaultSender: undefined,
    });

    assert.equal(
      (await result.ownerSender.owner()).toLowerCase(),
      defaultAccountAddress.toLowerCase()
    );
  });

  it("should allow changing the default sender that the ignition deployment runs against", async function () {
    const [, notTheDefaultAccount] = await this.hre.ethers.getSigners();
    const differentAccountAddress = notTheDefaultAccount.address;

    const moduleDefinition = buildModule("Module", (m) => {
      const ownerSender = m.contract("OwnerSender");

      return { ownerSender };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      defaultSender: differentAccountAddress,
    });

    assert.equal(
      (await result.ownerSender.owner()).toLowerCase(),
      differentAccountAddress.toLowerCase()
    );
  });

  it("has a guard against eth_accounts deprecation, and falls back to empty array", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const ownerSender = m.contract("OwnerSender");

      return { ownerSender };
    });

    const originalRequest = this.hre.network.provider.request;

    // stub the provider so eth_accounts is deprecated
    this.hre.network.provider.request = async function (
      params: RequestArguments
    ) {
      if (params.method === "eth_accounts") {
        throw new Error("the method has been deprecated: eth_accounts");
      }

      return originalRequest.call(this, params);
    };

    // no accounts -> ADDRESS undefined error
    await assert.isRejected(
      this.hre.ignition.deploy(moduleDefinition, {
        defaultSender: undefined,
      }),
      /invalid value "undefined" supplied to : ADDRESS/
    );

    // stub the provider to raise a different error
    this.hre.network.provider.request = async function (
      params: RequestArguments
    ) {
      if (params.method === "eth_accounts") {
        throw new Error("generic provider error");
      }

      return originalRequest.call(this, params);
    };

    // generic provider error, instead of defaulting to empty array
    await assert.isRejected(
      this.hre.ignition.deploy(moduleDefinition, {
        defaultSender: undefined,
      }),
      "generic provider error"
    );
  });
});
