import type { HardhatEthers } from "../src/types.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { initializeTestEthers } from "./helpers/helpers.js";

describe("error messages", () => {
  let ethers: HardhatEthers;

  // TODO: enable when V3 is ready: V3 node required
  // describe("in-process hardhat network", async () => {
  //   ({ ethers } = await initializeTestEthers([
  //     { artifactName: "Contract", fileName: "error-messages" },
  //   ]));

  //   runTests(ethers);
  // });

  describe("hardhat node", async () => {
    ({ ethers } = await initializeTestEthers([
      { artifactName: "Contract", fileName: "error-messages" },
    ]));

    runTests(ethers);
  });
});

function runTests(ethers: HardhatEthers) {
  it("should return the right error message for a transaction that reverts with a reason string", async () => {
    const contract = await ethers.deployContract("Contract");

    // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
    await assert.rejects(
      contract.revertsWithReasonString(),
      "reverted with reason string 'some reason'",
    );
  });

  it("should return the right error message for a transaction that reverts without a reason string", async () => {
    const contract = await ethers.deployContract("Contract");

    // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
    await assert.rejects(
      contract.revertsWithoutReasonString(),
      "reverted without a reason string",
    );
  });

  it("should return the right error message for a transaction that reverts with an OOO", async () => {
    const contract = await ethers.deployContract("Contract");

    // eslint-disable-next-line no-restricted-syntax -- it tests a non Hardhat error
    await assert.rejects(
      contract.succeeds({
        gasLimit: 21_064,
      }),
      "ran out of gas",
    );
  });
}
