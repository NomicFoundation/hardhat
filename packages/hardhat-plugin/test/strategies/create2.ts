/* eslint-disable import/no-unused-modules */
import {
  DeploymentStrategyType,
  buildModule,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { presignedTx } from "../test-helpers/createX-tx";
import { mineBlock } from "../test-helpers/mine-block";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";
import { waitForPendingTxs } from "../test-helpers/wait-for-pending-txs";

describe("create2", function () {
  describe("preexisting createX contract", function () {
    describe("known chain ID", function () {
      useEphemeralIgnitionProject("create2-known-chain-id");

      it("should deploy a contract using a createX contract from the known list", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          return { foo };
        });

        await this.hre.network.provider.request({
          method: "hardhat_setBalance",
          params: [
            "0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5",
            "0x58D15E176280000",
          ],
        });

        await this.hre.network.provider.request({
          method: "eth_sendRawTransaction",
          params: [presignedTx],
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: DeploymentStrategyType.CREATE2,
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.equal(
          result.foo.address,
          "0xD0413777977a4060eEBbb10aEA136576376755D9"
        );

        assert.equal(this.hre.network.config.chainId, 1);
        assert.equal(await result.foo.read.x(), Number(1));
      });
    });

    describe("unknown chain ID", function () {
      useEphemeralIgnitionProject("create2-unknown-chain-id");

      it("should deploy a contract using a createX contract not on the known list", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          return { foo };
        });

        await this.hre.network.provider.request({
          method: "hardhat_setBalance",
          params: [
            "0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5",
            "0x58D15E176280000",
          ],
        });

        await this.hre.network.provider.request({
          method: "eth_sendRawTransaction",
          params: [presignedTx],
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: DeploymentStrategyType.CREATE2,
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.equal(
          result.foo.address,
          "0xD0413777977a4060eEBbb10aEA136576376755D9"
        );

        assert.equal(this.hre.network.config.chainId, 88888);
        assert.equal(await result.foo.read.x(), Number(1));
      });
    });
  });

  describe("no preexisting createX contract", function () {
    describe("hardhat network", function () {
      useEphemeralIgnitionProject("minimal");

      it("should deploy a contract using create2 on hardhat network", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: DeploymentStrategyType.CREATE2,
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.equal(
          result.foo.address,
          "0x160Fae6Ab2dbd1204533d7858BE281eb4d45BB15"
        );

        assert.equal(this.hre.network.config.chainId, 31337);
        assert.equal(await result.foo.read.x(), Number(1));
      });
    });

    describe("non hardhat network", function () {
      useEphemeralIgnitionProject("create2-unknown-chain-id");

      it("should throw when no createX contract exists on the network", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          return { foo };
        });

        assert.equal(this.hre.network.config.chainId, 88888);
        await assert.isRejected(
          this.hre.ignition.deploy(moduleDefinition, {
            strategy: DeploymentStrategyType.CREATE2,
          }),
          /IGN1: Internal Hardhat Ignition invariant was violated: CreateX not deployed on current network/
        );
      });
    });
  });
});
