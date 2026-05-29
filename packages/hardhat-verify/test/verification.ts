import type { Interceptable } from "@nomicfoundation/hardhat-utils/request";
import type { HardhatUserConfig } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import { VERIFICATION_PROVIDERS } from "../src/internal/verification-providers.js";
import {
  verifyContract,
  validateArgs,
  validateVerificationProviderName,
} from "../src/internal/verification.js";
import { deployContract, initializeTestDispatcher } from "../test/utils.js";

describe("verification", () => {
  describe("verifyContract", () => {
    describe("base cases", () => {
      useEphemeralFixtureProject("integration");
      const etherscanApiUrl = new URL("https://api-sepolia.etherscan.io")
        .origin;
      const testDispatcher = initializeTestDispatcher({
        url: etherscanApiUrl,
      });

      let hardhatUserConfig: HardhatUserConfig;
      let hre: HardhatRuntimeEnvironment;
      before(async () => {
        hardhatUserConfig =
          // eslint-disable-next-line import/no-relative-packages -- allowed in test
          (await import("./fixture-projects/integration/hardhat.config.js"))
            .default;
        hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);
        await hre.tasks.getTask("build").run();
      });

      beforeEach(() => {
        mockEtherscanRequests(testDispatcher.interceptable);
      });

      it("should verify a contract with no constructor arguments or libraries", async () => {
        const { provider } = await hre.network.create();
        const address = await deployContract("Counter", [], {}, hre, provider);

        const result = await verifyContract(
          {
            address,
          },
          hre,
          () => {},
          testDispatcher.interceptable,
          provider,
        );

        assert.ok(result, "Verification should return true");
      });

      it("should verify a contract with constructor arguments", async () => {
        const constructorArgs = [0, true];
        const { provider } = await hre.network.create();
        const address = await deployContract(
          "CounterWithArgs",
          [0, true],
          {},
          hre,
          provider,
        );

        const result = await verifyContract(
          {
            address,
            constructorArgs,
          },
          hre,
          () => {},
          testDispatcher.interceptable,
          provider,
        );

        assert.ok(result, "Verification should return true");
      });

      it("should verify a contract with libraries", async () => {
        const { provider } = await hre.network.create();
        const libAddress = await deployContract(
          "CounterLib",
          [],
          {},
          hre,
          provider,
        );
        const libraries = { CounterLib: libAddress };
        const address = await deployContract(
          "CounterWithLib",
          [],
          libraries,
          hre,
          provider,
        );

        const result = await verifyContract(
          {
            address,
            libraries,
          },
          hre,
          () => {},
          testDispatcher.interceptable,
          provider,
        );

        assert.ok(result, "Verification should return true");
      });

      it("should verify a contract with constructor arguments and libraries", async () => {
        const constructorArgs = [0, true];
        const { provider } = await hre.network.create();
        const libAddress = await deployContract(
          "CounterLib",
          [],
          {},
          hre,
          provider,
        );
        const libraries = { CounterLib: libAddress };
        const address = await deployContract(
          "CounterWithArgsAndLib",
          constructorArgs,
          libraries,
          hre,
          provider,
        );

        const result = await verifyContract(
          {
            address,
            constructorArgs,
            libraries,
          },
          hre,
          () => {},
          testDispatcher.interceptable,
          provider,
        );

        assert.ok(result, "Verification should return true");
      });

      it("should verify a contract on a disabled provider", async () => {
        const localHre = await createHardhatRuntimeEnvironment({
          ...hardhatUserConfig,
          verify: {
            etherscan: {
              enabled: false,
              apiKey: "someApiKey",
            },
          },
        });
        const { provider } = await localHre.network.create();
        const address = await deployContract(
          "Counter",
          [],
          {},
          localHre,
          provider,
        );

        const result = await verifyContract(
          {
            address,
          },
          localHre,
          () => {},
          testDispatcher.interceptable,
          provider,
        );

        assert.ok(
          !localHre.config.verify.etherscan.enabled,
          "Etherscan verification should be disabled",
        );
        assert.ok(result, "Verification should return true");
      });
    });

    describe("retry behavior", () => {
      useEphemeralFixtureProject("integration");
      const etherscanApiUrl = new URL("https://api-sepolia.etherscan.io")
        .origin;
      const testDispatcher = initializeTestDispatcher({
        url: etherscanApiUrl,
      });

      let hre: HardhatRuntimeEnvironment;
      before(async () => {
        const hardhatUserConfig =
          // eslint-disable-next-line import/no-relative-packages -- allowed in test
          (await import("./fixture-projects/integration/hardhat.config.js"))
            .default;
        hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);
        await hre.tasks.getTask("build").run();
      });

      it("should skip the full-input retry when the explorer rejects the constructor arguments", async () => {
        const { provider } = await hre.network.create();
        const address = await deployContract("Counter", [], {}, hre, provider);

        // Only a single verification attempt is mocked. If the code retried with
        // the full input it would issue a second verifysourcecode request with no
        // interceptor, which disableNetConnect() rejects, and the dispatcher's
        // afterEach pending-interceptor check would also fail.
        mockEtherscanVerificationFlow(testDispatcher.interceptable, [
          "Fail - Unable to verify. Please check if the correct constructor argument was entered.",
        ]);

        await assertRejectsWithHardhatError(
          verifyContract(
            { address },
            hre,
            () => {},
            testDispatcher.interceptable,
            provider,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .CONTRACT_VERIFICATION_FAILED,
          {
            reason:
              "Fail - Unable to verify. Please check if the correct constructor argument was entered.",
            librariesWarning: "",
          },
        );
      });

      it("should retry with the full input when the minimal attempt fails with a bytecode mismatch", async () => {
        const { provider } = await hre.network.create();
        const address = await deployContract("Counter", [], {}, hre, provider);

        // Two attempts: the minimal input fails with a bytecode mismatch (which
        // the retry can fix by resubmitting with the artifact's settings), then
        // the full input succeeds.
        mockEtherscanVerificationFlow(testDispatcher.interceptable, [
          "Fail - Unable to verify. Compiled contract deployment bytecode does NOT match the transaction deployment bytecode.",
          "Pass - Verified",
        ]);

        const result = await verifyContract(
          { address },
          hre,
          () => {},
          testDispatcher.interceptable,
          provider,
        );

        assert.ok(result, "Verification should return true after the retry");
      });
    });

    describe("build profile mismatch", () => {
      useEphemeralFixtureProject("integration");
      const testDispatcher = initializeTestDispatcher({
        url: "https://fake-explorer.test",
      });

      let baseConfig: HardhatUserConfig;
      before(async () => {
        baseConfig =
          // eslint-disable-next-line import/no-relative-packages -- allowed in test
          (await import("./fixture-projects/integration/hardhat.config.js"))
            .default;
      });

      beforeEach(() => {
        // Mock only the `isVerified` getsourcecode lookup. verifysourcecode is
        // intentionally NOT mocked — every test in this block must throw
        // before any verification submission. If a regression submits, the
        // dispatcher's disableNetConnect() + pending-interceptor check will
        // surface it loudly.
        testDispatcher.interceptable
          .intercept({
            path: /^\/(?:v2\/)?api\?action=getsourcecode&address=0x[a-fA-F0-9]{40}&apikey=[A-Za-z0-9]+&chainid=\d+&module=contract$/,
            method: "GET",
          })
          .reply(200, { status: "1", result: [{ SourceCode: "" }] });
      });

      it("should throw ARTIFACT_BUILD_PROFILE_MISMATCH when the artifact was compiled with a different profile than verify is using", async () => {
        const hre = await createHardhatRuntimeEnvironment(baseConfig);

        // Build with production → artifacts on disk = production-compiled.
        await hre.tasks.getTask("build").run({
          defaultBuildProfile: "production",
          force: true,
        });

        // Deploy. On-chain deployedBytecode = production-compiled.
        const { provider } = await hre.network.create();
        const address = await deployContract("Counter", [], {}, hre, provider);

        // Re-build with default → artifacts on disk = default-compiled,
        // while the on-chain bytecode is still production.
        await hre.tasks.getTask("build").run({
          defaultBuildProfile: "default",
          force: true,
        });

        // Verify defaults to "production". The artifact matches "default" —
        // detection should throw the precise error before any submission.
        await assertRejectsWithHardhatError(
          verifyContract(
            { address },
            hre,
            () => {},
            testDispatcher.interceptable,
            provider,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .ARTIFACT_BUILD_PROFILE_MISMATCH,
          {
            artifactProfile: "default",
            buildProfileName: "production",
            contractDescription: "any of your local contracts",
          },
        );
      });

      it("should fall back to the generic DEPLOYED_BYTECODE_MISMATCH when the artifact matches the active build profile", async () => {
        const hre = await createHardhatRuntimeEnvironment(baseConfig);

        // Build with production → every artifact reflects production settings,
        // which is also what verify will use (the active profile).
        await hre.tasks.getTask("build").run({
          defaultBuildProfile: "production",
          force: true,
        });

        // Deploy Counter, but verify with CounterWithArgs's FQN at Counter's
        // address. #resolveByFqn re-compiles CounterWithArgs's artifact (also
        // production-compiled) against Counter's on-chain bytecode → bytecode
        // mismatch. Profile detection then sees the artifact matches the
        // active profile and must fall back to the generic error.
        const { provider } = await hre.network.create();
        const address = await deployContract("Counter", [], {}, hre, provider);

        await assertRejectsWithHardhatError(
          verifyContract(
            {
              address,
              contract: "contracts/CounterWithArgs.sol:CounterWithArgs",
            },
            hre,
            () => {},
            testDispatcher.interceptable,
            provider,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DEPLOYED_BYTECODE_MISMATCH,
          {
            contractDescription:
              'the contract "contracts/CounterWithArgs.sol:CounterWithArgs"',
          },
        );
      });

      it("should fall back to the generic DEPLOYED_BYTECODE_MISMATCH when no configured profile matches the artifact", async () => {
        // Build via an HRE that has an extra "weird" profile (runs: 1). After
        // this build, the on-disk artifacts reflect runs: 1.
        const buildConfig: HardhatUserConfig = {
          ...baseConfig,
          solidity: {
            profiles: {
              default: {
                compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
              },
              production: {
                compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
              },
              weird: {
                compilers: [
                  {
                    version: "0.8.28",
                    settings: { optimizer: { enabled: true, runs: 1 } },
                  },
                  {
                    version: "0.8.33",
                    settings: { optimizer: { enabled: true, runs: 1 } },
                  },
                ],
              },
            },
          },
        };
        const buildHre = await createHardhatRuntimeEnvironment(buildConfig);
        await buildHre.tasks.getTask("build").run({
          defaultBuildProfile: "weird",
          force: true,
        });

        const { provider } = await buildHre.network.create();
        const address = await deployContract(
          "Counter",
          [],
          {},
          buildHre,
          provider,
        );

        // Verify with an HRE that does NOT have `weird` in its config. The
        // local CounterWithArgs artifact (runs: 1) doesn't match the verify
        // HRE's `default` (no optimizer); `production` is active and skipped.
        // No profile matches → fall back to the generic error.
        const verifyHre = await createHardhatRuntimeEnvironment(baseConfig);

        await assertRejectsWithHardhatError(
          verifyContract(
            {
              address,
              contract: "contracts/CounterWithArgs.sol:CounterWithArgs",
            },
            verifyHre,
            () => {},
            testDispatcher.interceptable,
            provider,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DEPLOYED_BYTECODE_MISMATCH,
          {
            contractDescription:
              'the contract "contracts/CounterWithArgs.sol:CounterWithArgs"',
          },
        );
      });

      it("should identify the artifact profile when it is the third (non-default, non-production) configured profile", async () => {
        const configWithStaging: HardhatUserConfig = {
          ...baseConfig,
          solidity: {
            profiles: {
              default: {
                compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
              },
              production: {
                compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
              },
              staging: {
                compilers: [
                  {
                    version: "0.8.28",
                    settings: { optimizer: { enabled: true, runs: 999 } },
                  },
                  {
                    version: "0.8.33",
                    settings: { optimizer: { enabled: true, runs: 999 } },
                  },
                ],
              },
            },
          },
        };
        const hre = await createHardhatRuntimeEnvironment(configWithStaging);

        // Build with `default`. Deploy. On-chain = default-compiled.
        await hre.tasks.getTask("build").run({
          defaultBuildProfile: "default",
          force: true,
        });
        const { provider } = await hre.network.create();
        const address = await deployContract("Counter", [], {}, hre, provider);

        // Rebuild with `staging` so the on-disk artifacts reflect runs: 999.
        await hre.tasks.getTask("build").run({
          defaultBuildProfile: "staging",
          force: true,
        });

        // Verify defaults to `production`. The artifact matches neither
        // `default` nor `production`, but matches `staging` — the loop must
        // iterate past `default` to find the match.
        await assertRejectsWithHardhatError(
          verifyContract(
            { address },
            hre,
            () => {},
            testDispatcher.interceptable,
            provider,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .ARTIFACT_BUILD_PROFILE_MISMATCH,
          {
            artifactProfile: "staging",
            buildProfileName: "production",
            contractDescription: "any of your local contracts",
          },
        );
      });

      it("should identify the artifact profile when the match comes from a per-source override", async () => {
        // `production-counter-override` overrides Counter.sol to use runs: 1.
        // Other contracts in the profile compile with the compiler-level
        // settings (no optimizer here).
        const configWithOverride: HardhatUserConfig = {
          ...baseConfig,
          solidity: {
            profiles: {
              default: {
                compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
              },
              production: {
                compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
              },
              "production-counter-override": {
                compilers: [{ version: "0.8.28" }, { version: "0.8.33" }],
                overrides: {
                  "contracts/Counter.sol": {
                    version: "0.8.33",
                    settings: { optimizer: { enabled: true, runs: 1 } },
                  },
                },
              },
            },
          },
        };
        const hre = await createHardhatRuntimeEnvironment(configWithOverride);

        // Build with `default`. Deploy Counter. On-chain Counter = no optimizer.
        await hre.tasks.getTask("build").run({
          defaultBuildProfile: "default",
          force: true,
        });
        const { provider } = await hre.network.create();
        const address = await deployContract("Counter", [], {}, hre, provider);

        // Rebuild with `production-counter-override` → local Counter artifact
        // reflects runs: 1 (via the override). Other artifacts get the
        // compiler-level settings (no optimizer).
        await hre.tasks.getTask("build").run({
          defaultBuildProfile: "production-counter-override",
          force: true,
        });

        // Use the FQN path so we constrain detection to Counter and exercise
        // override resolution unambiguously. The artifact (runs: 1) only
        // matches `production-counter-override` via the Counter.sol override.
        await assertRejectsWithHardhatError(
          verifyContract(
            {
              address,
              contract: "contracts/Counter.sol:Counter",
            },
            hre,
            () => {},
            testDispatcher.interceptable,
            provider,
          ),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .ARTIFACT_BUILD_PROFILE_MISMATCH,
          {
            artifactProfile: "production-counter-override",
            buildProfileName: "production",
            contractDescription: 'the contract "contracts/Counter.sol:Counter"',
          },
        );
      });
    });

    // TODO: Include remaining `hardhat-verify` verification test cases
    describe.todo("all cases", () => {
      it("should throw an error when etherscan is not enabled in the hardhat config", async () => {});

      it("should throw an error when the selected build profile does not exist", async () => {});

      it("should throw an error when etherscan is not configured for the current network", async () => {});

      it("should throw an error when the verification status endpoint returns a 3xx response and the force flag is not set", async () => {});

      it("should return true when the contract is already verified and the force flag is not set", async () => {});

      it("should log a message when the contract is already verified and the force flag is not set", async () => {});

      it("should throw an error when the deployed contract solc version does not match the configured solc version", async () => {});

      it("should log a message when the contract is sent for verification (with the minimal compiler input)", async () => {});

      it("should return true when the contract is verified successfully (with the minimal compiler input)", async () => {});

      it("should log a message when the contract is verified successfully (with the minimal compiler input)", async () => {});

      it("should log a message when the verification fails (with the minimal compiler input)", async () => {});

      it("should log a message when the contract is sent for verification (with the full compiler input)", async () => {});

      it("should return true when the contract is verified successfully (with the full compiler input)", async () => {});

      it("should throw an error when the contract verification fails (with the full compiler input)", async () => {});
    });
  });

  describe("validateArgs", () => {
    const validAddress = "0xabc1234567890abcdef1234567890abcdef12345";
    const invalidAddress = "not-an-address";
    const validFqn = "contracts/Token.sol:Token";
    const invalidFqn = "Token";

    it("should not throw for a valid address and no contract", () => {
      validateArgs({ address: validAddress, contract: undefined });
    });

    it("should not throw for a valid address and valid fqn", () => {
      validateArgs({ address: validAddress, contract: validFqn });
    });

    it("should throw an error for an invalid address", () => {
      assertThrowsHardhatError(
        () =>
          validateArgs({
            address: invalidAddress,
            contract: undefined,
          }),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.INVALID_ADDRESS,
        { value: invalidAddress },
      );
    });

    it("should throw an error for an invalid contract name", () => {
      assertThrowsHardhatError(
        () =>
          validateArgs({
            address: validAddress,
            contract: invalidFqn,
          }),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_FULLY_QUALIFIED_NAME,
        { name: invalidFqn },
      );
    });
  });

  describe("Provider Factory Pattern", () => {
    it("VERIFICATION_PROVIDERS should not be empty", () => {
      const providerCount = Object.keys(VERIFICATION_PROVIDERS).length;
      assert.ok(
        providerCount > 0,
        "VERIFICATION_PROVIDERS should contain providers",
      );
    });

    it("all providers should have resolveConfig method", () => {
      for (const [providerName, provider] of Object.entries(
        VERIFICATION_PROVIDERS,
      )) {
        assert.equal(
          typeof provider.resolveConfig,
          "function",
          `Provider "${providerName}" should have resolveConfig method`,
        );
      }
    });

    it("all providers should have create method", () => {
      for (const [providerName, provider] of Object.entries(
        VERIFICATION_PROVIDERS,
      )) {
        assert.equal(
          typeof provider.create,
          "function",
          `Provider "${providerName}" should have create method`,
        );
      }
    });

    it("all providers should have getSupportedChains method", () => {
      for (const [providerName, provider] of Object.entries(
        VERIFICATION_PROVIDERS,
      )) {
        assert.equal(
          typeof provider.getSupportedChains,
          "function",
          `Provider "${providerName}" should have getSupportedChains method`,
        );
      }
    });
  });

  describe("validateVerificationProviderName", () => {
    it("should accept valid provider names", () => {
      validateVerificationProviderName("etherscan");
      validateVerificationProviderName("blockscout");
      validateVerificationProviderName("sourcify");
    });

    it("should throw error for invalid provider names", () => {
      assertThrowsHardhatError(
        () => {
          validateVerificationProviderName("invalid");
        },
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION
          .INVALID_VERIFICATION_PROVIDER,
        {
          verificationProvider: "invalid",
          supportedVerificationProviders: Object.keys(
            VERIFICATION_PROVIDERS,
          ).join(", "),
        },
      );

      assertThrowsHardhatError(
        () => {
          validateVerificationProviderName("ethscan");
        },
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION
          .INVALID_VERIFICATION_PROVIDER,
        {
          verificationProvider: "ethscan",
          supportedVerificationProviders: Object.keys(
            VERIFICATION_PROVIDERS,
          ).join(", "),
        },
      );
    });
  });
});

function mockEtherscanRequests(interceptable: Interceptable) {
  interceptable
    .intercept({
      path: /^\/(?:v2\/)?api\?action=getsourcecode&address=0x[a-fA-F0-9]{40}&apikey=[A-Za-z0-9]+&chainid=\d+&module=contract$/,
      method: "GET",
    })
    .reply(200, { status: "1", result: [{ SourceCode: "" }] });

  interceptable
    .intercept({
      path: /^\/(?:v2\/)?api\?action=verifysourcecode&apikey=[A-Za-z0-9]+&chainid=\d+&module=contract$/,
      method: "POST",
    })
    .reply(200, {
      status: "1",
      message: "OK",
      result: "1234",
    });

  interceptable
    .intercept({
      path: /^\/(?:v2\/)?api\?action=checkverifystatus&apikey=[A-Za-z0-9]+&chainid=\d+&guid=1234&module=contract$/,
      method: "GET",
    })
    .reply(200, {
      status: "1",
      result: "Pass - Verified",
    });
}

// Mocks a full Etherscan verification flow: the initial isVerified() lookup
// (reported as not verified), followed by one verifysourcecode + checkverifystatus
// pair per entry in `statusResults` (one per verification attempt).
function mockEtherscanVerificationFlow(
  interceptable: Interceptable,
  statusResults: string[],
) {
  interceptable
    .intercept({
      path: /^\/(?:v2\/)?api\?action=getsourcecode&address=0x[a-fA-F0-9]{40}&apikey=[A-Za-z0-9]+&chainid=\d+&module=contract$/,
      method: "GET",
    })
    .reply(200, { status: "1", result: [{ SourceCode: "" }] });

  for (const result of statusResults) {
    interceptable
      .intercept({
        path: /^\/(?:v2\/)?api\?action=verifysourcecode&apikey=[A-Za-z0-9]+&chainid=\d+&module=contract$/,
        method: "POST",
      })
      .reply(200, { status: "1", message: "OK", result: "1234" });

    interceptable
      .intercept({
        path: /^\/(?:v2\/)?api\?action=checkverifystatus&apikey=[A-Za-z0-9]+&chainid=\d+&guid=1234&module=contract$/,
        method: "GET",
      })
      .reply(200, { status: "1", result });
  }
}
