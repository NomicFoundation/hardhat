import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { createProvider } from "hardhat/internal/core/providers/construction";
import { JsonRpcServer } from "hardhat/internal/hardhat-network/jsonrpc/server";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { FUSAKA_TRANSACTION_GAS_LIMIT } from "../src/internal/constants";
import { useGeneratedEnvironment } from "./environment";

use(chaiAsPromised);

// This test suite generates different gas configuration
// combinations and runs some common tests for all of them.

type GasLimitValue = "default" | "auto" | number;
type ConnectedNetwork = "hardhat" | "localhost";

interface Combination {
  hardhatGasLimit: GasLimitValue;
  localhostGasLimit: GasLimitValue;
  connectedNetwork: ConnectedNetwork;
}

function generateCombinations(): Combination[] {
  const result: Combination[] = [];

  const hardhatGasLimitValues: GasLimitValue[] = ["default", "auto", 1_000_000];
  const localhostGasLimitValues: GasLimitValue[] = [
    "default",
    "auto",
    1_000_000,
  ];
  const connectedNetworkValues: ConnectedNetwork[] = ["hardhat", "localhost"];

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

describe("gas config behavior", function () {
  for (const {
    hardhatGasLimit,
    localhostGasLimit,
    connectedNetwork,
  } of generateCombinations()) {
    describe(`hardhat gas limit: ${hardhatGasLimit} | localhostGasLimit: ${localhostGasLimit} | connectedNetwork: ${connectedNetwork}`, function () {
      useGeneratedEnvironment(
        hardhatGasLimit,
        localhostGasLimit,
        connectedNetwork
      );

      // for some combinations there will be a default gas limit that is used
      // when no explicit gas limit is set by the user; in those cases, we
      // assert that the tx indeed uses that gas limit; if not, then
      // the result of an estimateGas call should be used
      let defaultGasLimit: bigint | undefined;
      if (
        (connectedNetwork === "hardhat" && hardhatGasLimit === 1_000_000) ||
        (connectedNetwork === "localhost" && localhostGasLimit === 1_000_000)
      ) {
        defaultGasLimit = 1_000_000n;
      } else if (
        (connectedNetwork === "hardhat" && hardhatGasLimit === "default") ||
        (connectedNetwork === "localhost" && localhostGasLimit === "default")
      ) {
        // expect the block gas limit to be the default transaction gas
        // limit from Fusaka (EIP 7825)
        defaultGasLimit = BigInt(FUSAKA_TRANSACTION_GAS_LIMIT);
      }

      it("plain transaction, default gas limit", async function () {
        const expectedGasLimit = defaultGasLimit ?? 21_001n;

        const [signer] = await this.env.ethers.getSigners();
        const tx = await signer.sendTransaction({
          to: signer,
        });

        assert.strictEqual(tx.gasLimit, expectedGasLimit);
      });

      it("plain transaction, explicit gas limit", async function () {
        const [signer] = await this.env.ethers.getSigners();

        const tx = await signer.sendTransaction({
          to: signer,
          gasLimit: 500_000,
        });

        assert.strictEqual(tx.gasLimit, 500_000n);
      });

      it("contract deployment, default gas limit", async function () {
        const expectedGasLimit = defaultGasLimit ?? 76_985n;

        await this.env.run("compile", { quiet: true });
        const example: any = await this.env.ethers.deployContract("Example");
        const deploymentTx = await example.deploymentTransaction();

        assert.strictEqual(deploymentTx.gasLimit, expectedGasLimit);
      });

      it("contract deployment, explicit gas limit", async function () {
        await this.env.run("compile", { quiet: true });
        const Example: any =
          await this.env.ethers.getContractFactory("Example");
        const example = await Example.deploy({
          gasLimit: 500_000,
        });
        const deploymentTx = await example.deploymentTransaction();

        assert.strictEqual(deploymentTx.gasLimit, 500_000n);
      });

      it("contract call, default gas limit", async function () {
        const expectedGasLimit = defaultGasLimit ?? 21_186n;

        await this.env.run("compile", { quiet: true });
        const example: any = await this.env.ethers.deployContract("Example");
        const tx = await example.f();

        assert.strictEqual(tx.gasLimit, expectedGasLimit);
      });

      it("contract call, explicit gas limit", async function () {
        await this.env.run("compile", { quiet: true });
        const example: any = await this.env.ethers.deployContract("Example");
        const tx = await example.f({
          gasLimit: 500_000,
        });

        assert.strictEqual(tx.gasLimit, 500_000n);
      });
    });
  }

  describe("amsterdam hardfork", function () {
    // From Amsterdam, the default gas limit is the block gas limit capped at
    // EIP-8037's 2^32 - 1, instead of EIP-7825's 2^24.
    const AMSTERDAM_DEFAULT_GAS_LIMIT = 60_000_000;

    describe("connected to the in-process hardhat network", function () {
      useGeneratedEnvironment(
        "default",
        "default",
        "hardhat",
        undefined,
        "amsterdam"
      );

      it("plain transaction, default gas limit", async function () {
        const [signer] = await this.env.ethers.getSigners();
        const tx = await signer.sendTransaction({ to: signer });

        assert.strictEqual(tx.gasLimit, BigInt(AMSTERDAM_DEFAULT_GAS_LIMIT));
      });
    });

    describe("connected to a hardhat node over localhost", function () {
      // The shared test node runs the default hardfork, so we start a node
      // for the amsterdam-node fixture project, in process, on a free port.
      const fixtureProjectPath = path.resolve(
        __dirname,
        "fixture-projects",
        "amsterdam-node"
      );

      // Init code that writes 200 fresh storage slots and deploys an empty
      // contract. EIP-8037's state gas takes it above 2^24 total gas.
      const STATE_HEAVY_INIT_CODE = "0x60c85b808055600190038060025700";

      let server: JsonRpcServer | undefined;

      before("Starting an amsterdam node", async function () {
        const previousCwd = process.cwd();
        process.chdir(fixtureProjectPath);

        try {
          process.env.HARDHAT_NETWORK = "hardhat";
          const nodeEnv: HardhatRuntimeEnvironment = require("hardhat");
          const provider = await createProvider(nodeEnv.config, "hardhat");
          resetHardhatContext();

          server = new JsonRpcServer({
            hostname: "127.0.0.1",
            port: 0,
            provider,
          });
          const { port } = await server.listen();

          process.env.AMSTERDAM_NODE_URL = `http://127.0.0.1:${port}`;
          process.env.HARDHAT_NETWORK = "localhost";
          this.env = require("hardhat");
        } finally {
          process.chdir(previousCwd);
        }
      });

      after("Stopping the amsterdam node", async function () {
        resetHardhatContext();
        delete process.env.AMSTERDAM_NODE_URL;
        delete process.env.HARDHAT_NETWORK;
        await server?.close();
      });

      it("deploys a contract needing more than 2^24 gas without a gas limit", async function () {
        const [signer] = await this.env.ethers.getSigners();
        const tx = await signer.sendTransaction({
          data: STATE_HEAVY_INIT_CODE,
        });
        const receipt = await tx.wait();

        assert.strictEqual(tx.gasLimit, BigInt(AMSTERDAM_DEFAULT_GAS_LIMIT));
        assert.strictEqual(receipt?.status, 1);
        assert.isAbove(Number(receipt?.gasUsed), FUSAKA_TRANSACTION_GAS_LIMIT);
      });
    });
  });
});
