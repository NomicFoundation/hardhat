import type { VerificationSubtask } from "../..";
import { assert, expect } from "chai";
import sinon, { SinonStub } from "sinon";

import {
  TASK_VERIFY_ETHERSCAN,
  TASK_VERIFY_GET_VERIFICATION_SUBTASKS,
  TASK_VERIFY_ETHERSCAN_RESOLVE_ARGUMENTS,
  TASK_VERIFY_SOURCIFY,
  TASK_VERIFY_SOURCIFY_DISABLED_WARNING,
  TASK_VERIFY_VERIFY,
} from "../../src/internal/task-names";
import { getRandomAddress, useEnvironment } from "../helpers";

describe("verify task", () => {
  useEnvironment("hardhat-project");

  describe(TASK_VERIFY_ETHERSCAN_RESOLVE_ARGUMENTS, () => {
    it("should throw if address is not provided", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN_RESOLVE_ARGUMENTS, {
          constructorArgsParams: [],
          constructorArgs: "constructor-args.js",
          libraries: "libraries.js",
        })
      ).to.be.rejectedWith(/You didn’t provide any address./);
    });

    it("should throw if address is invalid", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN_RESOLVE_ARGUMENTS, {
          address: "invalidAddress",
          constructorArgsParams: [],
          constructorArgs: "constructor-args.js",
          libraries: "libraries.js",
        })
      ).to.be.rejectedWith(/invalidAddress is an invalid address./);
    });

    it("should throw if contract is not a fully qualified name", async function () {
      await expect(
        this.hre.run(TASK_VERIFY_ETHERSCAN_RESOLVE_ARGUMENTS, {
          address: getRandomAddress(this.hre),
          constructorArgsParams: [],
          constructorArgs: "constructor-args.js",
          libraries: "libraries.js",
          contract: "not-a-fully-qualified-name",
        })
      ).to.be.rejectedWith(/A valid fully qualified name was expected./);
    });

    it("should return the processed arguments", async function () {
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
          NormalLib: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
          ConstructorLib: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
        },
        contractFQN: "contracts/TestContract.sol:TestContract",
        force: false,
      };
      const processedArgs = await this.hre.run(
        TASK_VERIFY_ETHERSCAN_RESOLVE_ARGUMENTS,
        {
          address,
          constructorArgsParams: [],
          constructorArgs: "constructor-args.js",
          libraries: "libraries.js",
          contract: "contracts/TestContract.sol:TestContract",
        }
      );

      assert.deepEqual(processedArgs, expectedArgs);
    });
  });

  describe(TASK_VERIFY_VERIFY, () => {
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

  describe(TASK_VERIFY_GET_VERIFICATION_SUBTASKS, () => {
    // suppress warnings
    let warnStub: SinonStub;
    beforeEach(() => {
      warnStub = sinon.stub(console, "warn");
    });
    afterEach(() => {
      warnStub.restore();
    });

    it("should return the etherscan subtask by default", async function () {
      const verificationSubtasks: VerificationSubtask[] = await this.hre.run(
        TASK_VERIFY_GET_VERIFICATION_SUBTASKS
      );

      assert.isTrue(
        verificationSubtasks.some(
          ({ subtaskName }) => subtaskName === TASK_VERIFY_ETHERSCAN
        )
      );
    });

    it("should return the etherscan subtask if it is enabled", async function () {
      const originalConfig = this.hre.config.etherscan;
      this.hre.config.etherscan = {
        enabled: true,
        apiKey: "",
        customChains: [],
      };

      const verificationSubtasks: VerificationSubtask[] = await this.hre.run(
        TASK_VERIFY_GET_VERIFICATION_SUBTASKS
      );

      this.hre.config.etherscan = originalConfig;

      assert.isTrue(
        verificationSubtasks.some(
          ({ subtaskName }) => subtaskName === TASK_VERIFY_ETHERSCAN
        )
      );
    });

    it("should ignore the etherscan subtask if it is disabled", async function () {
      const originalConfig = this.hre.config.etherscan;
      this.hre.config.etherscan = {
        enabled: false,
        apiKey: "",
        customChains: [],
      };

      const verificationSubtasks: VerificationSubtask[] = await this.hre.run(
        TASK_VERIFY_GET_VERIFICATION_SUBTASKS
      );

      this.hre.config.etherscan = originalConfig;

      assert.isFalse(
        verificationSubtasks.some(
          ({ subtaskName }) => subtaskName === TASK_VERIFY_ETHERSCAN
        )
      );
    });

    it("should ignore the sourcify subtask by default", async function () {
      const verificationSubtasks: VerificationSubtask[] = await this.hre.run(
        TASK_VERIFY_GET_VERIFICATION_SUBTASKS
      );

      assert.isFalse(
        verificationSubtasks.some(
          ({ subtaskName }) => subtaskName === TASK_VERIFY_SOURCIFY
        )
      );
    });

    it("should return the sourcify subtask if it is enabled", async function () {
      const originalConfig = this.hre.config.sourcify;
      this.hre.config.sourcify = {
        enabled: true,
      };

      const verificationSubtasks: VerificationSubtask[] = await this.hre.run(
        TASK_VERIFY_GET_VERIFICATION_SUBTASKS
      );

      this.hre.config.sourcify = originalConfig;

      assert.isTrue(
        verificationSubtasks.some(
          ({ subtaskName }) => subtaskName === TASK_VERIFY_SOURCIFY
        )
      );
      assert.isFalse(
        verificationSubtasks.some(
          ({ subtaskName }) =>
            subtaskName === TASK_VERIFY_SOURCIFY_DISABLED_WARNING
        )
      );
    });

    it("should provide a warning message if both etherscan and sourcify are disabled", async function () {
      const originalEtherscanConfig = this.hre.config.etherscan;
      this.hre.config.etherscan = {
        enabled: false,
        apiKey: "",
        customChains: [],
      };
      const originalSourcifyConfig = this.hre.config.etherscan;
      this.hre.config.sourcify = {
        enabled: false,
      };

      await this.hre.run(TASK_VERIFY_GET_VERIFICATION_SUBTASKS);

      this.hre.config.etherscan = originalEtherscanConfig;
      this.hre.config.sourcify = originalSourcifyConfig;

      assert.isTrue(warnStub.calledOnce);
      expect(warnStub).to.be.calledWith(
        sinon.match(/\[WARNING\] No verification services are enabled./)
      );
    });
  });
});
