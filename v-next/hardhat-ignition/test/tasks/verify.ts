import type { VerifyContractArgs } from "@nomicfoundation/hardhat-verify/verify";
import type { VerifyResult } from "@nomicfoundation/ignition-core";
import type { VerificationProvidersConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { assert } from "chai";
import sinon from "sinon";

import { verify } from "../../src/internal/tasks/verify.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("ignition verify task", () => {
  useEphemeralIgnitionProject("minimal");

  // TODO: replace with disableConsole() once converted to `node:test`
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

    process.exitCode = undefined;
  });

  const exampleVerifyInfo: VerifyResult = {
    address: "0x1234567890123456789012345678901234567890",
    constructorArgs: [],
    libraries: {},
    contract: "contracts/Foo.sol:Foo",
    creationTxHash:
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  };

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
      yield exampleVerifyInfo;
    };

    await verify(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      mockVerifyContract,
      mockGetVerificationInformation,
    );

    assert.equal(verifyCallsByProvider.length, 3);
    assert.include(verifyCallsByProvider, "etherscan");
    assert.include(verifyCallsByProvider, "blockscout");
    assert.include(verifyCallsByProvider, "sourcify");

    assert.equal(process.exitCode, undefined);
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
      yield exampleVerifyInfo;
    };

    await verify(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      mockVerifyContract,
      mockGetVerificationInformation,
    );

    assert.equal(verifyCallsByProvider.length, 3);
    assert.include(verifyCallsByProvider, "etherscan");
    assert.include(verifyCallsByProvider, "blockscout");
    assert.include(verifyCallsByProvider, "sourcify");

    assert.equal(process.exitCode, 1);
  });

  it("should not verify when no providers are enabled", async function () {
    let verifyContractCalled = false;

    await verify(
      { deploymentId: "test-deployment", force: false },
      {
        ...this.hre,
        config: {
          ...this.hre.config,
          verify: {
            etherscan: { enabled: false, apiKey: "" as any },
            blockscout: { enabled: false },
            sourcify: { enabled: false },
          },
        },
      },
      async () => {
        verifyContractCalled = true;

        return true;
      },
      async function* () {},
    );

    assert.isFalse(verifyContractCalled);
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

    await verify(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      mockVerifyContract,
      mockGetVerificationInformation,
    );

    // 2 contracts × 3 providers = 6 calls
    assert.equal(verifyCalls.length, 6);

    // Each contract should be verified on each provider
    assert.deepEqual(verifyCalls, [
      { provider: "etherscan", contract: "contracts/Foo.sol:Foo" },
      { provider: "blockscout", contract: "contracts/Foo.sol:Foo" },
      { provider: "sourcify", contract: "contracts/Foo.sol:Foo" },
      { provider: "etherscan", contract: "contracts/Bar.sol:Bar" },
      { provider: "blockscout", contract: "contracts/Bar.sol:Bar" },
      { provider: "sourcify", contract: "contracts/Bar.sol:Bar" },
    ]);
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
      yield exampleVerifyInfo;
    };

    await verify(
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

  it("should not verify if contracts artifacts cannot be resolved", async function () {
    let verifyContractCalled = false;

    const mockGetVerificationInformation = async function* () {
      yield "contracts/Foo.sol:Foo";
    };

    await verify(
      { deploymentId: "test-deployment", force: false },
      this.hre,
      async () => {
        verifyContractCalled = true;

        return true;
      },
      mockGetVerificationInformation,
    );

    assert.isFalse(verifyContractCalled);
  });
});
