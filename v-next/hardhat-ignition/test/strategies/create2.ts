import type { NetworkConnection } from "hardhat/types/network";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { presignedTx } from "../test-helpers/createX-tx.js";
import { externallyLoadedContractArtifact } from "../test-helpers/externally-loaded-contract.js";
import { mineBlock } from "../test-helpers/mine-block.js";
import {
  useEphemeralIgnitionProject,
  useFileIgnitionProject,
} from "../test-helpers/use-ignition-project.js";
import { waitForPendingTxs } from "../test-helpers/wait-for-pending-txs.js";

describe("create2", function () {
  const example32ByteSalt =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const anotherExample32ByteSalt =
    "0xabcde67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  const EXPECTED_FOO_CREATE2_ADDRESS =
    "0xA901a97D596320CC5b4E61f6B315F6128fAfF10B";
  const EXPECTED_BAR_CREATE2_ADDRESS =
    "0xD69fFd6F8cD5741be7B483F9af1d896F5F89a8FF";
  const EXPECTED_CUSTOM_SALT_FOO_CREATE2_ADDRESS =
    "0x2FbECc7173383C5878FF8EC336da0775CbF77fF7";

  const moduleDefinition = buildModule("FooModule", (m) => {
    // Use a known bytecode to ensure the same address is generated
    // via create2
    const foo = m.contract("Foo", externallyLoadedContractArtifact);

    return { foo };
  });

  describe("non-hardhat network", function () {
    describe("preexisting createX contract", function () {
      useEphemeralIgnitionProject("create2-exists-chain");

      beforeEach(async function () {
        await deployCreateXFactory(this.connection);
      });

      [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      ].forEach((accountAddress) => {
        it(`should deploy a contract from account <${accountAddress}> using the createX factory to the expected address`, async function () {
          const deployPromise = this.ignition.deploy(moduleDefinition, {
            strategy: "create2",
            defaultSender: accountAddress,
            strategyConfig: {
              salt: example32ByteSalt,
            },
          });

          await waitForPendingTxs(this.connection, 1, deployPromise);
          await mineBlock(this.connection);

          const result = await deployPromise;

          assert.equal(result.foo.address, EXPECTED_FOO_CREATE2_ADDRESS);

          assert.equal(this.connection.networkConfig.chainId, 1);
          assert.equal(await result.foo.read.x(), Number(1));
        });
      });

      it(`should support endowing eth to the deployed contract`, async function () {
        const deployPromise = this.ignition.deploy(
          buildModule("ValueModule", (m) => {
            const foo = m.contract("Foo", [], {
              value: 1_000_000_000n,
            });

            return { foo };
          }),
          {
            strategy: "create2",
            strategyConfig: {
              salt: example32ByteSalt,
            },
          },
        );

        await waitForPendingTxs(this.connection, 1, deployPromise);
        await mineBlock(this.connection);

        const result = await deployPromise;

        const balance = await this.connection.provider.request({
          method: "eth_getBalance",
          params: [result.foo.address, "latest"],
        });

        assert.equal(balance, 1_000_000_000n);
      });

      it(`should throw if you attempt to endow when the constructor isn't payable`, async function () {
        await assert.isRejected(
          this.ignition.deploy(
            buildModule("ValueModule", (m) => {
              const foo = m.contract("Unpayable", [], {
                value: 1_000_000_000n,
              });

              return { foo };
            }),
            {
              strategy: "create2",
              strategyConfig: {
                salt: example32ByteSalt,
              },
            },
          ),
          /Simulating the transaction failed with error: Reverted with custom error FailedContractCreation/,
        );
      });

      it("should deploy with a custom salt", async function () {
        const deployPromise = this.ignition.deploy(moduleDefinition, {
          strategy: "create2",
          strategyConfig: {
            salt: anotherExample32ByteSalt,
          },
        });

        await waitForPendingTxs(this.connection, 1, deployPromise);
        await mineBlock(this.connection);

        const result = await deployPromise;

        assert.equal(
          result.foo.address,
          EXPECTED_CUSTOM_SALT_FOO_CREATE2_ADDRESS,
        );

        assert.equal(this.connection.networkConfig.chainId, 1);
        assert.equal(await result.foo.read.x(), Number(1));
      });
    });

    describe("no preexisting createX contract", function () {
      useEphemeralIgnitionProject("create2-not-exists-chain");

      it("should throw when no createX contract exists on the network", async function () {
        assert.equal(this.connection.networkConfig.chainId, 88888);
        await assert.isRejected(
          this.ignition.deploy(moduleDefinition, {
            strategy: "create2",
            strategyConfig: {
              salt: example32ByteSalt,
            },
          }),
          /CreateX not deployed on current network 88888/,
        );
      });
    });
  });

  describe("hardhat network", function () {
    useEphemeralIgnitionProject("minimal");

    it("should deploy a createX factory then use it to deploy the given contract", async function () {
      const deployPromise = this.ignition.deploy(moduleDefinition, {
        strategy: "create2",
        strategyConfig: {
          salt: example32ByteSalt,
        },
      });

      await waitForPendingTxs(this.connection, 1, deployPromise);
      await mineBlock(this.connection);

      const result = await deployPromise;

      assert.equal(result.foo.address, EXPECTED_FOO_CREATE2_ADDRESS);

      assert.equal(this.connection.networkConfig.chainId, 31337);
      assert.equal(await result.foo.read.x(), Number(1));
    });

    it("should use an existing createX factory to deploy the given contract", async function () {
      // Run create2 once deploying the factory
      const firstDeployPromise = this.ignition.deploy(moduleDefinition, {
        strategy: "create2",
        strategyConfig: {
          salt: example32ByteSalt,
        },
      });

      await waitForPendingTxs(this.connection, 1, firstDeployPromise);
      await mineBlock(this.connection);

      await firstDeployPromise;

      // Run a second deploy, this time leveraging the existing create2 factory
      const secondDeployPromise = this.ignition.deploy(
        buildModule("Second", (m) => {
          const bar = m.contract("Bar");

          return { bar };
        }),
        {
          strategy: "create2",
          strategyConfig: {
            salt: example32ByteSalt,
          },
        },
      );

      await waitForPendingTxs(this.connection, 1, secondDeployPromise);
      await mineBlock(this.connection);

      const secondDeployResult = await secondDeployPromise;

      assert.equal(
        secondDeployResult.bar.address,
        EXPECTED_BAR_CREATE2_ADDRESS,
      );
      assert((await secondDeployResult.bar.read.isBar()) === true);
    });
  });

  describe("config", function () {
    useFileIgnitionProject("create2-bad-config", "attempt-bad-config");

    it("should throw if salt is not defined in Hardhat config", async function () {
      // TODO: HH3 can this pattern be improved on with utils?

      await assertRejectsWithHardhatError(
        this.hre.tasks.getTask(["ignition", "deploy"]).run({
          modulePath: "./ignition/modules/MyModule.js",
          strategy: "create2",
        }),
        HardhatError.ERRORS.IGNITION.STRATEGIES.MISSING_CONFIG_PARAM,
        {
          requiredParam: "salt",
          strategyName: "create2",
        },
      );
    });
  });
});

async function deployCreateXFactory(connection: NetworkConnection) {
  await connection.provider.request({
    method: "hardhat_setBalance",
    params: ["0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5", "0x58D15E176280000"],
  });

  await connection.provider.request({
    method: "eth_sendRawTransaction",
    params: [presignedTx],
  });
}
