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

  it("should verify multiple contracts on all enabled providers", async function () {
    const verifyCalls: Array<{ provider: string; contract: string }> = [];

    const mockVerifyContract = async (
      args: VerifyContractArgs,
      _hre: HardhatRuntimeEnvironment,
    ) => {
      if (args.contract === undefined) {
        assert.fail("Expected contract to be passed");
      }

      if (args.provider !== undefined) {
        verifyCalls.push({ provider: args.provider, contract: args.contract });
      }

      return true;
    };

    const mockGetVerificationInformation = async function* () {
      yield {
        address: "0x1111111111111111111111111111111111111111",
        constructorArgs: [],
        libraries: {},
        contract: "contracts/Foo.sol:Foo",
        creationTxHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      };
      yield {
        address: "0x2222222222222222222222222222222222222222",
        constructorArgs: [123],
        libraries: {},
        contract: "contracts/Bar.sol:Bar",
        creationTxHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      };
    };

    await internalVerifyAction(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      mockVerifyContract,
      mockGetVerificationInformation,
    );

    // 2 contracts × 3 providers = 6 calls
    assert.equal(verifyCalls.length, 6);

    // Each contract should be verified on each provider
    for (const contract of ["contracts/Foo.sol:Foo", "contracts/Bar.sol:Bar"]) {
      for (const provider of ["etherscan", "blockscout", "sourcify"]) {
        assert.isTrue(
          verifyCalls.some(
            (c) => c.provider === provider && c.contract === contract,
          ),
          `Expected ${contract} to be verified on ${provider}`,
        );
      }
    }

    // Both contracts should have "Verifying contract" log lines
    const logCalls = consoleLogStub.getCalls().map((c) => c.args[0]);
    assert.isTrue(
      logCalls.some((log: string) =>
        log.includes('Verifying contract "contracts/Foo.sol:Foo"'),
      ),
    );
    assert.isTrue(
      logCalls.some((log: string) =>
        log.includes('Verifying contract "contracts/Bar.sol:Bar"'),
      ),
    );
  });

  it("should pass force flag through to each provider call", async function () {
    const forceValues: boolean[] = [];

    const mockVerifyContract = async (
      args: VerifyContractArgs,
      _hre: HardhatRuntimeEnvironment,
    ) => {
      if (args.force === undefined) {
        assert.fail("Expected force to be passed");
      }

      forceValues.push(args.force);

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
      { deploymentId: "test-deployment", force: true },
      this.hre,
      mockVerifyContract,
      mockGetVerificationInformation,
    );

    assert.equal(forceValues.length, 3);
    assert.isTrue(
      forceValues.every((f) => f === true),
      "Expected all verify calls to have force: true",
    );
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
