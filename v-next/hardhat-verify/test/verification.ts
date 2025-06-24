import type { JsonFragment } from "@ethersproject/abi";
import type { Interceptable } from "@nomicfoundation/hardhat-utils/request";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import { encodeConstructorArgs } from "../src/internal/constructor-args.js";
import { ETHERSCAN_API_URL } from "../src/internal/etherscan.js";
import { verifyContract, validateArgs } from "../src/internal/verification.js";
import { initializeTestDispatcher } from "../test/utils.js";

describe("verification", () => {
  describe("verifyContract", () => {
    describe("base cases", () => {
      useEphemeralFixtureProject("integration");
      const etherscanApiUrl = new URL(ETHERSCAN_API_URL).origin;
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
        await hre.tasks.getTask("compile").run();
      });

      beforeEach(() => {
        mockEtherscanRequests(testDispatcher.interceptable);
      });

      it("should verify a contract with no constructor arguments or libraries", async () => {
        const { provider } = await hre.network.connect();
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

        assert(result, "Verification should return true");
      });

      it("should verify a contract with constructor arguments", async () => {
        const constructorArgs = [0, true];
        const { provider } = await hre.network.connect();
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

        assert(result, "Verification should return true");
      });

      it("should verify a contract with libraries", async () => {
        const { provider } = await hre.network.connect();
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

        assert(result, "Verification should return true");
      });

      it("should verify a contract with constructor arguments and libraries", async () => {
        const constructorArgs = [0, true];
        const { provider } = await hre.network.connect();
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

        assert(result, "Verification should return true");
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
        () => validateArgs({ address: invalidAddress, contract: undefined }),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.INVALID_ADDRESS,
        { value: invalidAddress },
      );
    });

    it("should throw an error for an invalid contract name", () => {
      assertThrowsHardhatError(
        () => validateArgs({ address: validAddress, contract: invalidFqn }),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_FULLY_QUALIFIED_NAME,
        { name: invalidFqn },
      );
    });
  });
});

async function deployContract(
  contractName: string,
  constructorArgs: unknown[],
  libraries: Record<string, string>,
  hre: HardhatRuntimeEnvironment,
  provider: EthereumProvider,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  const deployer = accounts[0];

  const artifact = await hre.artifacts.readArtifact(contractName);

  let bytecode = artifact.bytecode;
  if (Object.keys(libraries).length > 0) {
    for (const [_, sourceLibraries] of Object.entries(
      artifact.linkReferences,
    )) {
      for (const [libName, libOffsets] of Object.entries(sourceLibraries)) {
        const libAddress = libraries[libName];
        const hex = getUnprefixedHexString(libAddress).toLowerCase();
        for (const { start, length } of libOffsets) {
          const offset = 2 + start * 2;
          bytecode =
            bytecode.slice(0, offset) +
            hex +
            bytecode.slice(offset + length * 2);
        }
      }
    }
  }

  const encodecConstructorArgs = await encodeConstructorArgs(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing
    artifact.abi as JsonFragment[],
    constructorArgs,
    contractName,
  );

  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: deployer,
        data: bytecode + encodecConstructorArgs,
      },
    ],
  });

  while (true) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt !== undefined) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing
      return (receipt as any).contractAddress;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

function mockEtherscanRequests(interceptable: Interceptable) {
  interceptable
    .intercept({
      path: /^\/v2\/api\?action=getsourcecode&address=0x[a-fA-F0-9]{40}&apikey=[A-Za-z0-9]+&chainid=\d+&module=contract$/,
      method: "GET",
    })
    .reply(200, { status: "1", result: [{ SourceCode: "" }] });

  interceptable
    .intercept({
      path: /^\/v2\/api\?action=verifysourcecode&apikey=[A-Za-z0-9]+&chainid=\d+&module=contract$/,
      method: "POST",
    })
    .reply(200, {
      status: "1",
      message: "OK",
      result: "1234",
    });

  interceptable
    .intercept({
      path: /^\/v2\/api\?action=checkverifystatus&apikey=[A-Za-z0-9]+&chainid=\d+&guid=1234&module=contract$/,
      method: "GET",
    })
    .reply(200, {
      status: "1",
      result: "Pass - Verified",
    });
}
