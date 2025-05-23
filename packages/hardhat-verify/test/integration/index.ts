import fs from "fs";
import path from "path";
import sinon, { SinonStub } from "sinon";
import { assert, expect } from "chai";
import { TASK_CLEAN, TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { SolcConfig } from "hardhat/types/config";
import {
  TASK_VERIFY,
  TASK_VERIFY_ETHERSCAN,
  TASK_VERIFY_VERIFY,
  TASK_VERIFY_SOURCIFY,
} from "../../src/internal/task-names";
import { deployContract, getRandomAddress, useEnvironment } from "../helpers";
import {
  interceptGetStatus,
  interceptIsVerified,
  interceptVerify,
  mockEnvironment,
} from "./mocks/etherscan";
import {
  interceptSourcifyIsVerified,
  interceptSourcifyVerify,
  mockEnvironmentSourcify,
} from "./mocks/sourcify";

import "../../src/internal/type-extensions";

describe("verify task integration tests", () => {
  useEnvironment("hardhat-project");
  mockEnvironment();

  // suppress sourcify info message
  let consoleInfoStub: SinonStub;
  let consoleWarnStub: SinonStub;
  before(() => {
    consoleInfoStub = sinon.stub(console, "info");
    consoleWarnStub = sinon.stub(console, "warn");
  });

  // suppress warnings
  after(() => {
    consoleInfoStub.restore();
    consoleWarnStub.restore();
  });

  it("should return after printing the supported networks", async function () {
    const logStub = sinon.stub(console, "log");
    const taskResponse = await this.hre.run(TASK_VERIFY, {
      listNetworks: true,
    });

    expect(logStub).to.be.calledOnceWith(
      sinon.match(/Networks supported by hardhat-verify/)
    );
    logStub.restore();
    assert.isUndefined(taskResponse);
  });

  it("should throw if the chain is hardhat", async function () {
    const address = getRandomAddress(this.hre);

    // cleanup the etherscan config since we have hardhat defined as custom chain
    const originalConfig = this.hre.config.etherscan;
    this.hre.config.etherscan = {
      enabled: true,
      apiKey: "",
      customChains: [],
    };

    await expect(
      this.hre.run(TASK_VERIFY_ETHERSCAN, {
        address,
        constructorArgsParams: [],
      })
    ).to.be.rejectedWith(
      /The selected network is "hardhat", which is not supported for contract verification./
    );

    this.hre.config.etherscan = originalConfig;
  });

  describe("with a verified contract", () => {
    beforeEach(() => {
      interceptIsVerified({ message: "OK", result: [{ SourceCode: "code" }] });
    });

    it("should return if the contract is already verified", async function () {
      const logStub = sinon.stub(console, "log");
      const address = getRandomAddress(this.hre);

      const taskResponse = await this.hre.run(TASK_VERIFY_ETHERSCAN, {
        address,
        constructorArgsParams: [],
      });

      expect(logStub).to.be.calledOnceWith(
        `The contract ${address} has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://hardhat.etherscan.io/address/${address}#code
`
      );
      logStub.restore();
      assert.isUndefined(taskResponse);
    });
  });

  describe("with a non-verified contract", () => {
    let simpleContractAddress: string;
    let duplicatedContractAddress: string;
    let normalLibAddress: string;
    let constructorLibAddress: string;
    let onlyNormalLibContractAddress: string;
    let bothLibsContractAddress: string;

    before(async function () {
      await this.hre.run(TASK_COMPILE, { force: true, quiet: true });
      simpleContractAddress = await deployContract(
        "SimpleContract",
        [],
        this.hre
      );
      duplicatedContractAddress = await deployContract(
        "contracts/DuplicatedContract.sol:DuplicatedContract",
        [],
        this.hre
      );
      normalLibAddress = await deployContract("NormalLib", [], this.hre);
      constructorLibAddress = await deployContract(
        "ConstructorLib",
        [],
        this.hre
      );
      onlyNormalLibContractAddress = await deployContract(
        "OnlyNormalLib",
        [],
        this.hre,
        undefined,
        { libraries: { NormalLib: normalLibAddress } }
      );
      bothLibsContractAddress = await deployContract(
        "BothLibs",
        [50],
        this.hre,
        undefined,
        {
          libraries: {
            NormalLib: normalLibAddress,
            ConstructorLib: constructorLibAddress,
          },
        }
      );
    });

    beforeEach(() => {
      interceptIsVerified({ message: "NOTOK", result: "" });
    });

    it("should throw if there is no contract deployed at address", async function () {
      const address = getRandomAddress(this.hre);

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        new RegExp(`The address ${address} has no bytecode.`)
      );
    });

    describe("with overriden config", () => {
      let originalCompilers: SolcConfig[];

      it("should throw if the deployed contract version does not match the configured version", async function () {
        originalCompilers = this.hre.config.solidity.compilers;
        this.hre.config.solidity.compilers = [
          { version: "0.8.19", settings: {} },
        ];

        await expect(
          this.hre.run(TASK_VERIFY_ETHERSCAN, {
            address: simpleContractAddress,
            constructorArgsParams: [],
          })
        ).to.be.rejectedWith(
          /The contract you want to verify was compiled with solidity 0.7.5, but your configured compiler version is: 0.8.19./
        );
      });

      afterEach(function () {
        this.hre.config.solidity.compilers = originalCompilers;
      });
    });

    describe("with deleted artifacts", () => {
      it("should throw if the artifacts are missing", async function () {
        await this.hre.run(TASK_CLEAN);

        // task will fail since we deleted all the artifacts
        await expect(
          this.hre.run(TASK_VERIFY_ETHERSCAN, {
            address: simpleContractAddress,
            constructorArgsParams: [],
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
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: duplicatedContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        /More than one contract was found to match the deployed bytecode./
      );
    });

    it("should throw if the provided contract FQN does not match any contract", async function () {
      const contractFQN = "contracts/SimpleContract.sol:NotFound";

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
          contract: contractFQN,
        })
      ).to.be.rejectedWith(
        new RegExp(
          `The contract ${contractFQN} is not present in your project.`
        )
      );
    });

    it("should throw if there is an invalid address in the libraries parameter", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
          libraries: "invalid-libraries.js",
        })
      ).to.be.rejectedWith(
        "You gave a link for the contract SimpleContract with the library SomeLibrary, but provided this invalid address: notAnAddress"
      );
    });

    it("should throw if the specified library is not used by the contract", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: bothLibsContractAddress,
          constructorArgsParams: [],
          libraries: "not-used-libraries.js",
        })
      ).to.be.rejectedWith(
        /You gave an address for the library SomeLibrary in the libraries dictionary, which is not one of the libraries of contract BothLibs./
      );
    });

    it("should throw if the specified library is listed more than once in the libraries parameter", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: onlyNormalLibContractAddress,
          constructorArgsParams: [],
          libraries: "duplicated-libraries.js",
        })
      ).to.be.rejectedWith(
        /The library names NormalLib and contracts\/WithLibs.sol:NormalLib refer to the same library/
      );
    });

    it("should throw if deployed library address does not match the address defined in the libraries parameter", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: onlyNormalLibContractAddress,
          constructorArgsParams: [],
          libraries: "mismatched-address-libraries.js",
        })
      ).to.be.rejectedWith(
        new RegExp(
          `NormalLib\ngiven address: 0x4B0d52f889e9a18506ee9412cd659abF48F8FEad\ndetected address: ${normalLibAddress.toLowerCase()}`
        )
      );
    });

    it("should throw if there are undetectable libraries not specified by the libraries parameter", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: bothLibsContractAddress,
          constructorArgsParams: [],
          libraries: "missing-undetectable-libraries.js",
        })
      ).to.be
        .rejectedWith(`The contract contracts/WithLibs.sol:BothLibs has one or more library addresses that cannot be detected from deployed bytecode.
This can occur if the library is only called in the contract constructor. The missing libraries are:
  * contracts/WithLibs.sol:ConstructorLib
`);
    });

    it("should throw if the verification request fails", async function () {
      // do not intercept the verifysourcecode request so it throws an error
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        /A network request failed\. This is an error from the block explorer, not Hardhat\. Error: getaddrinfo ENOTFOUND api-hardhat\.etherscan\.io/
      );
    });

    it("should throw if the verification response has a non-OK status code", async function () {
      interceptVerify({ error: "error verifying contract" }, 500);

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        /Failed to send contract verification request\.\nEndpoint URL: https:\/\/api-hardhat\.etherscan\.io\/api\n/s
      );
    });

    it("should throw if the etherscan api can't find the bytecode at the contract address", async function () {
      interceptVerify({
        status: 0,
        result: "Unable to locate ContractCode at 0x...",
      });

      try {
        await this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        });
        assert.fail("Expected error was not thrown");
      } catch (e: any) {
        assert.match(
          e.message,
          new RegExp(
            `The Etherscan API responded that the address ${simpleContractAddress} does not have bytecode.`
          )
        );
      }
    });

    it("should throw if the verification response status is not ok", async function () {
      interceptVerify({
        status: 0,
        result: "Failed to verify the contract...",
      });

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith("Failed to verify the contract...");
    });

    it("should throw if the get verification status request fails", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      // do not intercept the checkverifystatus request so it throws an error
      const logStub = sinon.stub(console, "log");

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        /A network request failed\. This is an error from the block explorer, not Hardhat\. Error: getaddrinfo ENOTFOUND api-hardhat\.etherscan\.io/
      );

      expect(logStub).to.be
        .calledOnceWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      logStub.restore();
    });

    it("should throw if the get verification status response has a non-OK status code", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      interceptGetStatus({ error: "error checking verification status" }, 500);
      const logStub = sinon.stub(console, "log");

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        `The HTTP server response is not ok. Status code: 500 Response text: {"error":"error checking verification status"}`
      );

      expect(logStub).to.be
        .calledOnceWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      logStub.restore();
    });

    it("should throw if the get verification status response status is not ok", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      interceptGetStatus({
        status: 0,
        result: "Failed to check verification status...",
      });
      const logStub = sinon.stub(console, "log");

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(
        /The Etherscan API responded with a failure status.\nThe verification may still succeed but should be checked manually./
      );

      expect(logStub).to.be
        .calledOnceWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      logStub.restore();
    });

    it("should throw if the etherscan API response changes", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      interceptGetStatus({
        status: 1,
        result: "a new API response",
      });
      const logStub = sinon.stub(console, "log");

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
        })
      ).to.be.rejectedWith(/The API responded with an unexpected message./);

      expect(logStub).to.be
        .calledOnceWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      logStub.restore();
    });

    it("should validate a contract using the minimal input", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      interceptGetStatus(() => {
        return {
          status: 1,
          result: "Pass - Verified",
        };
      });
      const logStub = sinon.stub(console, "log");

      const taskResponse = await this.hre.run(TASK_VERIFY, {
        address: simpleContractAddress,
        constructorArgsParams: [],
      });

      assert.equal(logStub.callCount, 2);
      expect(logStub.getCall(0)).to.be
        .calledWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      expect(logStub.getCall(1)).to.be
        .calledWith(`Successfully verified contract SimpleContract on the block explorer.
https://hardhat.etherscan.io/address/${simpleContractAddress}#code\n`);
      logStub.restore();
      assert.isUndefined(taskResponse);
    });

    it("should validate a contract using the full build", async function () {
      let verifyCallCount = 0;
      interceptVerify(() => {
        verifyCallCount++;
        return {
          status: 1,
          result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
        };
      }).times(2);
      let getStatusCallCount = 0;
      interceptGetStatus(() => {
        getStatusCallCount++;
        return {
          status: getStatusCallCount > 1 ? 1 : 0,
          result:
            getStatusCallCount > 1
              ? "Pass - Verified"
              : "Fail - Unable to verify",
        };
      }).times(2);
      const logStub = sinon.stub(console, "log");

      const taskResponse = await this.hre.run(TASK_VERIFY, {
        address: simpleContractAddress,
        constructorArgsParams: [],
      });

      assert.equal(logStub.callCount, 4);
      expect(logStub.getCall(0)).to.be
        .calledWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      expect(logStub.getCall(1)).to.be
        .calledWith(`We tried verifying your contract SimpleContract without including any unrelated one, but it failed.
Trying again with the full solc input used to compile and deploy it.
This means that unrelated contracts may be displayed on Etherscan...
`);
      expect(logStub.getCall(2)).to.be
        .calledWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      expect(logStub.getCall(3)).to.be
        .calledWith(`Successfully verified contract SimpleContract on the block explorer.
https://hardhat.etherscan.io/address/${simpleContractAddress}#code\n`);
      logStub.restore();
      assert.equal(verifyCallCount, 2);
      assert.equal(getStatusCallCount, 2);
      assert.isUndefined(taskResponse);
    });

    it("should fail if it can't validate the contract", async function () {
      let verifyCallCount = 0;
      interceptVerify(() => {
        verifyCallCount++;
        return {
          status: 1,
          result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
        };
      }).times(2);
      let getStatusCallCount = 0;
      interceptGetStatus(() => {
        getStatusCallCount++;
        return {
          status: getStatusCallCount > 1 ? 1 : 0,
          result: "Fail - Unable to verify",
        };
      }).times(2);
      const logStub = sinon.stub(console, "log");

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: bothLibsContractAddress,
          constructorArgsParams: ["50"],
          libraries: "libraries.js",
        })
      ).to.be.rejectedWith(/The contract verification failed./);

      assert.equal(logStub.callCount, 3);
      expect(logStub.getCall(0)).to.be
        .calledWith(`Successfully submitted source code for contract
contracts/WithLibs.sol:BothLibs at ${bothLibsContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      expect(logStub.getCall(1)).to.be
        .calledWith(`We tried verifying your contract BothLibs without including any unrelated one, but it failed.
Trying again with the full solc input used to compile and deploy it.
This means that unrelated contracts may be displayed on Etherscan...
`);
      expect(logStub.getCall(2)).to.be
        .calledWith(`Successfully submitted source code for contract
contracts/WithLibs.sol:BothLibs at ${bothLibsContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      logStub.restore();
      assert.equal(verifyCallCount, 2);
      assert.equal(getStatusCallCount, 2);
    });

    it("should validate a contract using the verify:verify subtask", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      interceptGetStatus({
        status: 1,
        result: "Pass - Verified",
      });
      const logStub = sinon.stub(console, "log");

      const taskResponse = await this.hre.run(TASK_VERIFY_VERIFY, {
        address: bothLibsContractAddress,
        constructorArguments: ["50"],
        libraries: {
          NormalLib: normalLibAddress,
          ConstructorLib: constructorLibAddress,
        },
      });

      assert.equal(logStub.callCount, 2);
      expect(logStub.getCall(0)).to.be
        .calledWith(`Successfully submitted source code for contract
contracts/WithLibs.sol:BothLibs at ${bothLibsContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      expect(logStub.getCall(1)).to.be
        .calledWith(`Successfully verified contract BothLibs on the block explorer.
https://hardhat.etherscan.io/address/${bothLibsContractAddress}#code\n`);
      logStub.restore();
      assert.isUndefined(taskResponse);
    });

    after(async function () {
      await this.hre.run(TASK_CLEAN);
    });
  });

  describe("with a verified contract and '--force' flag", () => {
    let simpleContractAddress: string;
    before(async function () {
      await this.hre.run(TASK_COMPILE, { force: true, quiet: true });
      simpleContractAddress = await deployContract(
        "SimpleContract",
        [],
        this.hre
      );
    });

    beforeEach(() => {
      interceptIsVerified({ message: "OK", result: [{ SourceCode: "code" }] });
    });

    it("should validate a partially verified contract", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      interceptGetStatus(() => {
        return {
          status: 1,
          result: "Pass - Verified",
        };
      });
      const logStub = sinon.stub(console, "log");

      const taskResponse = await this.hre.run(TASK_VERIFY, {
        address: simpleContractAddress,
        constructorArgsParams: [],
        force: true,
      });

      assert.equal(logStub.callCount, 2);
      expect(logStub.getCall(0)).to.be
        .calledWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      expect(logStub.getCall(1)).to.be
        .calledWith(`Successfully verified contract SimpleContract on the block explorer.
https://hardhat.etherscan.io/address/${simpleContractAddress}#code\n`);
      logStub.restore();
      assert.isUndefined(taskResponse);
    });

    it("should throw if the verification response status is 'already verified' (blockscout full matched)", async function () {
      interceptVerify({
        status: 0,
        result: "Smart-contract already verified.",
      });

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
          force: true,
        })
      ).to.be.rejectedWith(
        new RegExp(
          `The block explorer's API responded that the contract contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress} is already verified.`
        )
      );
    });

    // If contract was actually verified, Etherscan returns an error on the verification request.
    it("should throw if the verification response status is 'already verified' (etherscan manually verified)", async function () {
      interceptVerify({
        status: 0,
        result: "Contract source code already verified",
      });

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
          force: true,
        })
      ).to.be.rejectedWith(
        new RegExp(
          `The block explorer's API responded that the contract contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress} is already verified.`
        )
      );
    });

    // If contract was verified via matching a deployed bytecode of another contract,
    // Etherscan returns an error only on ve get verification status response.
    it("should throw if the get verification status is 'already verified' (etherscan automatically verified)", async function () {
      interceptVerify({
        status: 1,
        result: "ezq878u486pzijkvvmerl6a9mzwhv6sefgvqi5tkwceejc7tvn",
      });
      interceptGetStatus(() => {
        return {
          status: 0,
          result: "Already Verified",
        };
      });
      const logStub = sinon.stub(console, "log");

      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN, {
          address: simpleContractAddress,
          constructorArgsParams: [],
          force: true,
        })
      ).to.be.rejectedWith(
        new RegExp(
          `The block explorer's API responded that the contract contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress} is already verified.`
        )
      );

      expect(logStub).to.be
        .calledOnceWith(`Successfully submitted source code for contract
contracts/SimpleContract.sol:SimpleContract at ${simpleContractAddress}
for verification on the block explorer. Waiting for verification result...
`);
      logStub.restore();
    });

    after(async function () {
      await this.hre.run(TASK_CLEAN);
    });
  });
});

describe("verify task Sourcify's integration tests", () => {
  useEnvironment("hardhat-project");
  mockEnvironmentSourcify();

  describe("with a non-verified contract", () => {
    let simpleContractAddress: string;

    before(async function () {
      await this.hre.run(TASK_COMPILE, { force: true, quiet: true });
      simpleContractAddress = await deployContract(
        "SimpleContract",
        [],
        this.hre
      );
    });

    it("should verify a contract on Sourcify", async function () {
      interceptSourcifyIsVerified([
        { address: simpleContractAddress, status: "false" },
      ]);
      interceptSourcifyVerify({
        result: [
          {
            address: simpleContractAddress,
            status: "perfect",
          },
        ],
      });
      const logStub = sinon.stub(console, "log");
      // set network name to localhost to avoid the "hardhat is not supported" error
      this.hre.network.name = "localhost";

      const taskResponse = await this.hre.run(TASK_VERIFY_SOURCIFY, {
        address: simpleContractAddress,
        contract: "contracts/SimpleContract.sol:SimpleContract",
      });

      assert.equal(logStub.callCount, 1);
      (expect(logStub.getCall(0)).to.be as any)
        .calledWith(`Successfully verified contract SimpleContract on Sourcify.
https://repo.sourcify.dev/contracts/full_match/31337/${simpleContractAddress}/
`);
      logStub.restore();
      assert.isUndefined(taskResponse);
    });

    after(async function () {
      await this.hre.run(TASK_CLEAN);
    });
  });
});
