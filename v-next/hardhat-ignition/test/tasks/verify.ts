import type { VerifyContractArgs } from "@nomicfoundation/hardhat-verify/verify";
import type { VerificationProvidersConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { assert } from "chai";
import chalk from "chalk";
import sinon from "sinon";

import { internalVerifyAction } from "../../src/internal/tasks/verify.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("ignition verify task", () => {
  useEphemeralIgnitionProject("minimal");

  let consoleLogStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;
  let consoleErrorStub: sinon.SinonStub;

  beforeEach(() => {
    consoleLogStub = sinon.stub(console, "log");
    consoleWarnStub = sinon.stub(console, "warn");
    consoleErrorStub = sinon.stub(console, "error");
  });

  afterEach(() => {
    consoleLogStub.restore();
    consoleWarnStub.restore();
    consoleErrorStub.restore();
  });

  it("should verify on all enabled providers", async function () {
    const verifyCallsByProvider: Array<keyof VerificationProvidersConfig> = [];

    const mockVerifyContract = async (
      args: VerifyContractArgs,
      _hre: HardhatRuntimeEnvironment,
    ) => {
      if (args.provider !== undefined) {
        verifyCallsByProvider.push(args.provider);
      }
      return true;
    };

    const mockGetVerificationInformation = async function* () {
      yield {
        address: "0x1234567890123456789012345678901234567890",
        constructorArgs: [],
        libraries: {},
        contract: "contracts/Foo.sol:Foo",
        creationTxHash:
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      };
    };

    await internalVerifyAction(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      mockVerifyContract,
      mockGetVerificationInformation,
    );

    assert.equal(verifyCallsByProvider.length, 3);
    assert.include(verifyCallsByProvider, "etherscan");
    assert.include(verifyCallsByProvider, "blockscout");
    assert.include(verifyCallsByProvider, "sourcify");

    const logCalls = consoleLogStub.getCalls().map((c) => c.args[0]);
    assert.isTrue(
      logCalls.some((log: string) =>
        log.includes(chalk.cyan.bold("\n=== Etherscan ===")),
      ),
    );
    assert.isTrue(
      logCalls.some((log: string) =>
        log.includes(chalk.cyan.bold("\n=== Blockscout ===")),
      ),
    );
    assert.isTrue(
      logCalls.some((log: string) =>
        log.includes(chalk.cyan.bold("\n=== Sourcify ===")),
      ),
    );
  });

  it("should continue verification on other providers when one fails", async function () {
    const verifyCallsByProvider: Array<keyof VerificationProvidersConfig> = [];

    const mockVerifyContract = async (
      args: VerifyContractArgs,
      _hre: HardhatRuntimeEnvironment,
    ) => {
      if (args.provider !== undefined) {
        verifyCallsByProvider.push(args.provider);
        if (args.provider === "blockscout") {
          throw new Error("Blockscout verification failed");
        }
      }
      return true;
    };

    const mockGetVerificationInformation = async function* () {
      yield {
        address: "0x1234567890123456789012345678901234567890",
        constructorArgs: [],
        libraries: {},
        contract: "contracts/Foo.sol:Foo",
        creationTxHash:
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      };
    };

    await internalVerifyAction(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      mockVerifyContract,
      mockGetVerificationInformation,
    );

    assert.equal(verifyCallsByProvider.length, 3);
    assert.include(verifyCallsByProvider, "etherscan");
    assert.include(verifyCallsByProvider, "blockscout");
    assert.include(verifyCallsByProvider, "sourcify");

    const errorCalls = consoleErrorStub.getCalls().map((c) => c.args[0]);
    assert.isTrue(
      errorCalls.some((err: string) =>
        err.includes(chalk.red("Blockscout verification failed")),
      ),
    );
  });

  it("should warn when no providers are enabled", async function () {
    const originalConfig = this.hre.config.verify;
    (this.hre.config.verify as any) = {
      etherscan: { enabled: false, apiKey: "" },
      blockscout: { enabled: false },
      sourcify: { enabled: false },
    };

    try {
      await internalVerifyAction(
        { deploymentId: "test-deployment", force: false },
        this.hre,
        async () => true,
        async function* () {},
      );

      assert.isTrue(
        consoleWarnStub.calledWith(
          chalk.yellow("\n⚠️  No verification providers are enabled."),
        ),
      );
    } finally {
      this.hre.config.verify = originalConfig;
    }
  });

  it("should skip contracts when artifacts cannot be resolved", async function () {
    const mockGetVerificationInformation = async function* () {
      yield "contracts/Foo.sol:Foo";
    };

    await internalVerifyAction(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      async () => true,
      mockGetVerificationInformation,
    );

    const logCalls = consoleLogStub.getCalls().map((c) => c.args[0]);
    assert.isTrue(
      logCalls.some(
        (log: string) =>
          log.includes("Could not resolve contract artifacts") &&
          log.includes("contracts/Foo.sol:Foo"),
      ),
    );
  });
});
