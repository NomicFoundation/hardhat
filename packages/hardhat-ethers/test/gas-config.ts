import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";

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
        const Example: any = await this.env.ethers.getContractFactory(
          "Example"
        );
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
});
