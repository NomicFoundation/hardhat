import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createConnection } from "./test-helpers/create-hre.js";
import "@nomicfoundation/hardhat-ethers";

describe("config", () => {
  useEphemeralFixtureProject("config");

  it("should resolve config in the correct priority", async function () {
    const connection = await createConnection();

    const resolvedConfig = connection.ignition.getResolvedConfig({
      maxFeeBumps: 7,
    });

    assert.equal(resolvedConfig.requiredConfirmations, 42);
    assert.equal(resolvedConfig.maxFeeBumps, 7);
  });
});
