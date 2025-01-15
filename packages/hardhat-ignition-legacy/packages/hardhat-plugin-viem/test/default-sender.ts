import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useIgnitionProject } from "./test-helpers/use-ignition-project";

describe("support changing default sender", () => {
  useIgnitionProject("minimal");

  it("should deploy on the first HH account by default", async function () {
    const [defaultAccount] = await this.hre.viem.getWalletClients();
    const defaultAccountAddress = defaultAccount.account.address;

    const moduleDefinition = buildModule("Module", (m) => {
      const ownerSender = m.contract("OwnerSender");

      return { ownerSender };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      defaultSender: undefined,
    });

    assert.equal(
      (await result.ownerSender.read.owner()).toLowerCase(),
      defaultAccountAddress.toLowerCase()
    );
  });

  it("should allow changing the default sender that the ignition deployment runs against", async function () {
    const [, notTheDefaultAccount] = await this.hre.viem.getWalletClients();
    const differentAccountAddress = notTheDefaultAccount.account.address;

    const moduleDefinition = buildModule("Module", (m) => {
      const ownerSender = m.contract("OwnerSender");

      return { ownerSender };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      defaultSender: differentAccountAddress,
    });

    assert.equal(
      (await result.ownerSender.read.owner()).toLowerCase(),
      differentAccountAddress.toLowerCase()
    );
  });
});
