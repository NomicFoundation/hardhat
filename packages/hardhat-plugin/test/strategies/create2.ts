/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { presignedTx } from "../test-helpers/createX-tx";
import { externallyLoadedContractArtifact } from "../test-helpers/externally-loaded-contract";
import { mineBlock } from "../test-helpers/mine-block";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";
import { waitForPendingTxs } from "../test-helpers/wait-for-pending-txs";

describe("create2", function () {
  const EXPECTED_FOO_CREATE2_ADDRESS =
    "0xA666fE62aA1fD2A7e7C08F81Eba3f55F459A9002";
  const EXPECTED_BAR_CREATE2_ADDRESS =
    "0xF44091a604c7Ed92441Ea695c0f41C522466b4D3";

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
        await deployCreateXFactory(this.hre);
      });

      [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      ].forEach((accountAddress) => {
        it(`should deploy a contract from account <${accountAddress}> using the createX factory to the expected address`, async function () {
          const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
            strategy: "create2",
            defaultSender: accountAddress,
          });

          await waitForPendingTxs(this.hre, 1, deployPromise);
          await mineBlock(this.hre);

          const result = await deployPromise;

          assert.equal(result.foo.address, EXPECTED_FOO_CREATE2_ADDRESS);

          assert.equal(this.hre.network.config.chainId, 1);
          assert.equal(await result.foo.read.x(), Number(1));
        });
      });

      it(`should support endowing eth to the deployed contract`, async function () {
        const deployPromise = this.hre.ignition.deploy(
          buildModule("ValueModule", (m) => {
            const foo = m.contract("Foo", [], {
              value: 1_000_000_000n,
            });

            return { foo };
          }),
          {
            strategy: "create2",
          }
        );

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        const balance = await this.hre.network.provider.request({
          method: "eth_getBalance",
          params: [result.foo.address, "latest"],
        });

        assert.equal(balance, 1_000_000_000n);
      });

      it(`should throw if you attempt to endow when the constructor isn't payable`, async function () {
        await assert.isRejected(
          this.hre.ignition.deploy(
            buildModule("ValueModule", (m) => {
              const foo = m.contract("Unpayable", [], {
                value: 1_000_000_000n,
              });

              return { foo };
            }),
            {
              strategy: "create2",
            }
          ),
          /Simulating the transaction failed with error: Reverted with custom error FailedContractCreation/
        );
      });
    });

    describe("no preexisting createX contract", function () {
      useEphemeralIgnitionProject("create2-not-exists-chain");

      it("should throw when no createX contract exists on the network", async function () {
        assert.equal(this.hre.network.config.chainId, 88888);
        await assert.isRejected(
          this.hre.ignition.deploy(moduleDefinition, {
            strategy: "create2",
          }),
          /CreateX not deployed on current network 88888/
        );
      });
    });
  });

  describe("hardhat network", function () {
    useEphemeralIgnitionProject("minimal");

    it("should deploy a createX factory then use it to deploy the given contract", async function () {
      const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
        strategy: "create2",
      });

      await waitForPendingTxs(this.hre, 1, deployPromise);
      await mineBlock(this.hre);

      const result = await deployPromise;

      assert.equal(result.foo.address, EXPECTED_FOO_CREATE2_ADDRESS);

      assert.equal(this.hre.network.config.chainId, 31337);
      assert.equal(await result.foo.read.x(), Number(1));
    });

    it("should use an existing createX factory to deploy the given contract", async function () {
      // Run create2 once deploying the factory
      const firstDeployPromise = this.hre.ignition.deploy(moduleDefinition, {
        strategy: "create2",
      });

      await waitForPendingTxs(this.hre, 1, firstDeployPromise);
      await mineBlock(this.hre);

      await firstDeployPromise;

      // Run a second deploy, this time leveraging the existing create2 factory
      const secondDeployPromise = this.hre.ignition.deploy(
        buildModule("Second", (m) => {
          const bar = m.contract("Bar");

          return { bar };
        }),
        {
          strategy: "create2",
        }
      );

      await waitForPendingTxs(this.hre, 1, secondDeployPromise);
      await mineBlock(this.hre);

      const secondDeployResult = await secondDeployPromise;

      assert.equal(
        secondDeployResult.bar.address,
        EXPECTED_BAR_CREATE2_ADDRESS
      );
      assert(await secondDeployResult.bar.read.isBar());
    });
  });
});

async function deployCreateXFactory(hre: HardhatRuntimeEnvironment) {
  await hre.network.provider.request({
    method: "hardhat_setBalance",
    params: ["0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5", "0x58D15E176280000"],
  });

  await hre.network.provider.request({
    method: "eth_sendRawTransaction",
    params: [presignedTx],
  });
}
