import { assert, expect } from "chai";
import {
  TASK_VERIFY_PROCESS_ARGUMENTS,
  TASK_VERIFY_VERIFY,
} from "../../src/task-names";
import { getRandomAddress, useEnvironment } from "../helpers";

describe("verify task", () => {
  useEnvironment("hardhat-project");

  describe("verify:process-arguments", () => {
    it("should throw if address is not provided", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_PROCESS_ARGUMENTS, {
          constructorArgsParams: [],
          constructorArgs: "constructor-args.js",
          libraries: "libraries.js",
        })
      ).to.be.rejectedWith(/You didn’t provide any address./);
    });

    it("should throw if address is invalid", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_PROCESS_ARGUMENTS, {
          address: "invalidAddress",
          constructorArgsParams: [],
          constructorArgs: "constructor-args.js",
          libraries: "libraries.js",
        })
      ).to.be.rejectedWith(/invalidAddress is an invalid address./);
    });

    it("should throw if contract is not a fully qualified name", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_PROCESS_ARGUMENTS, {
          address: getRandomAddress(this.hre),
          constructorArgsParams: [],
          constructorArgs: "constructor-args.js",
          libraries: "libraries.js",
          contract: "not-a-fully-qualified-name",
        })
      ).to.be.rejectedWith(/A valid fully qualified name was expected./);
    });

    it("should return the proccesed arguments", async function () {
      const address = getRandomAddress(this.hre);
      const expectedArgs = {
        address,
        constructorArgs: [
          50,
          "a string argument",
          {
            x: 10,
            y: 5,
          },
          "0xabcdef",
        ],
        libraries: {
          NormalLib: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
          ConstructorLib: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
        },
        contractFQN: "contracts/TestContract.sol:TestContract",
        listNetworks: true,
        noCompile: true,
      };
      const proccesedArgs = await this.hre.run(TASK_VERIFY_PROCESS_ARGUMENTS, {
        address,
        constructorArgsParams: [],
        constructorArgs: "constructor-args.js",
        libraries: "libraries.js",
        contract: "contracts/TestContract.sol:TestContract",
        listNetworks: true,
        noCompile: true,
      });

      assert.deepEqual(proccesedArgs, expectedArgs);
    });
  });

  describe("verify:verify", () => {
    it("should throw if address is not provided", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_VERIFY, {
          constructorArguments: [],
          libraries: {},
        })
      ).to.be.rejectedWith(/You didn’t provide any address./);
    });

    it("should throw if address is invalid", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_VERIFY, {
          address: "invalidAddress",
          constructorArguments: [],
          libraries: {},
        })
      ).to.be.rejectedWith(/invalidAddress is an invalid address./);
    });

    it("should throw if contract is not a fully qualified name", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_VERIFY, {
          address: getRandomAddress(this.hre),
          constructorArguments: [],
          libraries: {},
          contract: "not-a-fully-qualified-name",
        })
      ).to.be.rejectedWith(/A valid fully qualified name was expected./);
    });

    it("should throw if constructorArguments is not an array", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_VERIFY, {
          address: getRandomAddress(this.hre),
          constructorArguments: { arg1: 1, arg2: 2 },
          libraries: {},
        })
      ).to.be.rejectedWith(
        /The constructorArguments parameter should be an array./
      );
    });

    it("should throw if libraries is not an object", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_VERIFY, {
          address: getRandomAddress(this.hre),
          constructorArguments: [],
          libraries: ["0x...1", "0x...2", "0x...3"],
        })
      ).to.be.rejectedWith(/The libraries parameter should be a dictionary./);
    });
  });
});
