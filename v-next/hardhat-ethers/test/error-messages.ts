import type { HardhatEthers } from "../src/types.js";
import type { JsonRpcServer } from "hardhat/tasks/node";

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { initializeTestEthers, spawnTestRpcServer } from "./helpers/helpers.js";

let ethers: HardhatEthers;

describe("error messages", () => {
  describe("hardhat node", async () => {
    let server: JsonRpcServer;
    let port: number;
    let address: string;

    before(async () => {
      ({ server, port, address } = await spawnTestRpcServer());
    });

    after(async () => {
      await server.close();
    });

    beforeEach(async () => {
      ({ ethers } = await initializeTestEthers(
        [{ artifactName: "Contract", fileName: "error-messages" }],
        {
          networks: {
            localhost: { type: "http", url: `http://${address}:${port}` },
          },
        },
      ));
    });

    defineTests();
  });

  describe("in-process hardhat network", async () => {
    beforeEach(async () => {
      ({ ethers } = await initializeTestEthers([
        { artifactName: "Contract", fileName: "error-messages" },
      ]));
    });

    defineTests();
  });
});

function defineTests() {
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
