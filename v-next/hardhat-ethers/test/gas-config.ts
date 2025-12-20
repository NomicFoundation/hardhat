// This test suite generates different gas configuration
// combinations and runs some common tests for all of them.

import type { HardhatEthers } from "../src/types.js";
import type { NetworkConfig } from "hardhat/types/config";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { initializeTestEthers } from "./helpers/helpers.js";

type GasLimitValue = "default" | "auto" | bigint;
type ConnectedNetwork = "default" | "localhost";

interface Combination {
  hardhatGasLimit: GasLimitValue;
  localhostGasLimit: GasLimitValue;
  connectedNetwork: ConnectedNetwork;
}

function generateCombinations(): Combination[] {
  const result: Combination[] = [];

  const hardhatGasLimitValues: GasLimitValue[] = [
    // TODO: enable when V3 is ready: when blockGasLimit is implemented
    // "default",
    "auto",
    1_000_000n,
  ];
  const localhostGasLimitValues: GasLimitValue[] = [
    // TODO: enable when V3 is ready: when blockGasLimit is implemented
    // "default",
    "auto",
    1_000_000n,
  ];

  const connectedNetworkValues: ConnectedNetwork[] = ["default", "localhost"];

  for (const hardhatGasLimit of hardhatGasLimitValues) {
    for (const localhostGasLimit of localhostGasLimitValues) {
      for (const connectedNetwork of connectedNetworkValues) {
        result.push({
          hardhatGasLimit,
          localhostGasLimit,
          connectedNetwork,
        });
      }
    }
  }

  return result;
}

describe("gas config behavior", () => {
  let ethers: HardhatEthers;
  let networkConfig: NetworkConfig;

  for (const {
    hardhatGasLimit,
    localhostGasLimit,
    connectedNetwork,
  } of generateCombinations()) {
    describe(`hardhat gas limit: ${hardhatGasLimit} | localhostGasLimit: ${localhostGasLimit} | connectedNetwork: ${connectedNetwork}`, () => {
      before(async () => {
        ({ ethers, networkConfig } = await initializeTestEthers([
          { artifactName: "Example", fileName: "gas-config" },
        ]));

        if (hardhatGasLimit !== "default" && connectedNetwork === "default") {
          networkConfig.gas = hardhatGasLimit;
        }

        if (
          localhostGasLimit !== "default" &&
          connectedNetwork === "localhost"
        ) {
          networkConfig.gas = localhostGasLimit;
        }
      });

      // for some combinations there will be a default gas limit that is used
      // when no explicit gas limit is set by the user; in those cases, we
      // assert that the tx indeed uses that gas limit; if not, then
      // the result of an estimateGas call should be used
      let defaultGasLimit: bigint | undefined;
      if (
        (connectedNetwork === "default" && hardhatGasLimit === 1_000_000n) ||
        (connectedNetwork === "localhost" && localhostGasLimit === 1_000_000n)
      ) {
        defaultGasLimit = 1_000_000n;
      } else if (
        (connectedNetwork === "default" && hardhatGasLimit === "default") ||
        (connectedNetwork === "localhost" && localhostGasLimit === "default")
      ) {
        // expect the block gas limit to be used as the default gas limit
        defaultGasLimit = 60_000_000n;
      }

      it("plain transaction, default gas limit", async () => {
        const expectedGasLimit = defaultGasLimit ?? 21_001n;

        const [signer] = await ethers.getSigners();
        const tx = await signer.sendTransaction({
          to: signer,
        });

        assert.equal(tx.gasLimit, expectedGasLimit);
      });

      it("plain transaction, explicit gas limit", async () => {
        const [signer] = await ethers.getSigners();

        const tx = await signer.sendTransaction({
          to: signer,
          gasLimit: 500_000,
        });

        assert.equal(tx.gasLimit, 500_000n);
      });

      it("contract deployment, default gas limit", async () => {
        const expectedGasLimit = defaultGasLimit ?? 76_985n;

        const example: any = await ethers.deployContract("Example");
        const deploymentTx = await example.deploymentTransaction();

        assert.equal(deploymentTx.gasLimit, expectedGasLimit);
      });

      it("contract deployment, explicit gas limit", async () => {
        const Example: any = await ethers.getContractFactory("Example");
        const example = await Example.deploy({
          gasLimit: 500_000,
        });
        const deploymentTx = await example.deploymentTransaction();

        assert.equal(deploymentTx.gasLimit, 500_000n);
      });

      it("contract call, default gas limit", async () => {
        const expectedGasLimit = defaultGasLimit ?? 21_186n;

        const example: any = await ethers.deployContract("Example");
        const tx = await example.f();

        assert.equal(tx.gasLimit, expectedGasLimit);
      });

      it("contract call, explicit gas limit", async () => {
        const example: any = await ethers.deployContract("Example");
        const tx = await example.f({
          gasLimit: 500_000,
        });

        assert.equal(tx.gasLimit, 500_000n);
      });
    });
  }
});
