import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";

import { createConnection } from "./test-helpers/create-hre.js";
import "@nomicfoundation/hardhat-ethers";

describe("support changing default sender", () => {
  useEphemeralFixtureProject("minimal");

  it("should deploy on the first HH account by default", async function () {
    const connection = await createConnection();

    const [defaultAccount] = await connection.ethers.getSigners();
    const defaultAccountAddress = defaultAccount.address;

    const moduleDefinition = buildModule("Module", (m) => {
      const ownerSender = m.contract("OwnerSender");

      return { ownerSender };
    });

    const result = await connection.ignition.deploy(moduleDefinition, {
      defaultSender: undefined,
    });

    assert.equal(
      (await result.ownerSender.owner()).toLowerCase(),
      defaultAccountAddress.toLowerCase(),
    );
  });

  it("should allow changing the default sender that the ignition deployment runs against", async function () {
    const connection = await createConnection();

    const [, notTheDefaultAccount] = await connection.ethers.getSigners();
    const differentAccountAddress = notTheDefaultAccount.address;

    const moduleDefinition = buildModule("Module", (m) => {
      const ownerSender = m.contract("OwnerSender");

      return { ownerSender };
    });

    const result = await connection.ignition.deploy(moduleDefinition, {
      defaultSender: differentAccountAddress,
    });

    assert.equal(
      (await result.ownerSender.owner()).toLowerCase(),
      differentAccountAddress.toLowerCase(),
    );
  });
});
