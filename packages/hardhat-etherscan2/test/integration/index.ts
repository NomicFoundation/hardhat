import fs from "fs";
import path from "path";
import sinon from "sinon";
import chai, { assert, expect } from "chai";
import { TASK_CLEAN, TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { TASK_VERIFY } from "../../src/task-names";
import { deployContract, getRandomAddress, useEnvironment } from "../helpers";
import { interceptIsVerified, mockEnvironment } from "./mocks/etherscan";

import "../../src/type-extensions";
chai.config.truncateThreshold = 0;
describe("verify task integration tests", () => {
  // this.timeout(1000000);
  useEnvironment("hardhat-project");
  mockEnvironment();

  it("should return after printing the supported networks", async function () {
    const logStub = sinon.stub(console, "log");
    const taskResponse = await this.hre.run(TASK_VERIFY, {
      address: getRandomAddress(this.hre),
      constructorArgsParams: [],
      listNetworks: true,
    });

    expect(logStub).to.be.calledOnceWith(
      sinon.match(/Networks supported by hardhat-etherscan/)
    );
    logStub.restore();
    assert.isUndefined(taskResponse);
  });

  describe("with a verified contract", () => {
    beforeEach(() => {
      interceptIsVerified({ message: "OK", result: [{ SourceCode: "code" }] });
    });

    it("should return if the contract is already verified", async function () {
      const logStub = sinon.stub(console, "log");
      const address = getRandomAddress(this.hre);

      const taskResponse = await this.hre.run(TASK_VERIFY, {
        address,
        constructorArgsParams: [],
      });

      expect(logStub).to.be.calledOnceWith(
        `The contract ${address} has already been verified`
      );
      logStub.restore();
      assert.isUndefined(taskResponse);
    });
  });

  describe("with a non-verified contract", () => {
    before(async function () {
      await this.hre.run(TASK_COMPILE, { force: true, quiet: true });
    });

    beforeEach(() => {
      interceptIsVerified({ message: "NOTOK", result: "" });
    });

    it("should throw if there is no contract deployed at address", async function () {
      const address = getRandomAddress(this.hre);

      await expect(
        this.hre.run(TASK_VERIFY, {
          address,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        new RegExp(`The address ${address} has no bytecode.`)
      );
    });

    it("should throw if the deployed contract version does not match the configured version", async function () {
      const deployedAddress = await deployContract("NewContract", [], this.hre);
      const originalCompilers = this.hre.config.solidity.compilers;
      this.hre.config.solidity.compilers = [
        { version: "0.8.19", settings: "" },
      ];

      await expect(
        this.hre.run(TASK_VERIFY, {
          address: deployedAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        /The contract you want to verify was compiled with solidity 0.7.5, but your configured compiler version is: 0.8.19./
      );

      this.hre.config.solidity.compilers = originalCompilers;
    });

    describe("with deleted artifacts", () => {
      it("should not compile the project when the noCompile is provided", async function () {
        const deployedAddress = await deployContract(
          "NewContract",
          [],
          this.hre
        );

        await this.hre.run(TASK_CLEAN);

        // task will fail since we deleted all the artifacts
        await expect(
          this.hre.run(TASK_VERIFY, {
            address: deployedAddress,
            constructorArgsParams: [],
            noCompile: true,
          })
        ).to.be.rejectedWith(
          /The address provided as argument contains a contract, but its bytecode doesn't match any of your local contracts./
        );
        assert.isFalse(fs.existsSync(path.join("artifacts", "contracts")));
        assert.isFalse(fs.existsSync(path.join("artifacts", "build-info")));
      });

      after(async function () {
        await this.hre.run(TASK_COMPILE, { force: true, quiet: true });
      });
    });

    it("should throw if the deployed bytecode matches more than one contract", async function () {
      const deployedAddress = await deployContract(
        "contracts/DuplicatedContract.sol:DuplicatedContract",
        [],
        this.hre
      );

      await expect(
        this.hre.run(TASK_VERIFY, {
          address: deployedAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        /More than one contract was found to match the deployed bytecode./
      );
    });

    it("should throw if the provided contract FQN does not match any contract", async function () {
      const deployedAddress = await deployContract("NewContract", [], this.hre);
      const contractFQN = "contracts/NewContract.sol:NotFound";

      await expect(
        this.hre.run(TASK_VERIFY, {
          address: deployedAddress,
          constructorArgsParams: [],
          contract: contractFQN,
        })
      ).to.be.rejectedWith(
        new RegExp(
          `The contract ${contractFQN} is not present in your project.`
        )
      );
    });
  });
});
