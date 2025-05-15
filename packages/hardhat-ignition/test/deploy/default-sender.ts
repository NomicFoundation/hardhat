/* eslint-disable import/no-unused-modules */
import { buildModule, RequestArguments } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

describe("default sender", function () {
  useEphemeralIgnitionProject("minimal");

  it("should throw if default sender is not in configured accounts", async function () {
    await assert.isRejected(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "ignition/modules/OwnModule.js",
          defaultSender: "0x1234567890abcdef1234567890abcdef12345678",
        }
      ),
      /IGN700: Default sender 0x1234567890abcdef1234567890abcdef12345678 is not part of the configured accounts./
    );
  });

  it("has a guard against eth_accounts deprecation, and falls back to empty array", async function () {
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
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "ignition/modules/OwnModule.js",
        }
      ),
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
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "ignition/modules/OwnModule.js",
        }
      ),
      "generic provider error"
    );
  });

  it("should allow setting default sender via cli", async function () {
    const secondAccountAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    await this.hre.run(
      { scope: "ignition", task: "deploy" },
      {
        modulePath: "ignition/modules/OwnModule.js",
        defaultSender: secondAccountAddress,
      }
    );

    const existingModule = buildModule("ExistingModule", (m) => {
      const bar = m.contractAt(
        "Ownable",
        "0x8464135c8F25Da09e49BC8782676a84730C318bC"
      );

      return { bar };
    });

    const result = await this.hre.ignition.deploy(existingModule);

    assert.equal(await result.bar.read.owner(), secondAccountAddress);
  });
});
