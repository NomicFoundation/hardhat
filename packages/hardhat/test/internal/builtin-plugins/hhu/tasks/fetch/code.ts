import type { NetworkHooks } from "../../../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  captureConsole,
} from "@nomicfoundation/hardhat-test-utils";

import hhu from "../../../../../../src/internal/builtin-plugins/hhu/index.js";
import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

// The first default account, and the address of its first contract
const SENDER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// PUSH1 42 PUSH1 0 MSTORE PUSH1 32 PUSH1 0 RETURN
const RUNTIME_CODE = "0x602a60005260206000f3";

// PUSH10 RUNTIME_CODE PUSH1 0 MSTORE PUSH1 10 PUSH1 22 RETURN
const INIT_CODE = "0x69602a60005260206000f3600052600a6016f3";

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
describe("hhu utils fetch tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment(
      { plugins: [hhu] },
      {},
      process.cwd(),
    );

    // Each connection is a fresh chain, so the contract is redeployed
    const networkHooks: Partial<NetworkHooks> = {
      newConnection: async (context, next) => {
        const connection = await next(context);

        await connection.provider.request({
          method: "eth_sendTransaction",
          params: [{ from: SENDER, data: INIT_CODE }],
        });

        return connection;
      },
    };

    hre.hooks.registerHandlers("network", networkHooks);
  });

  describe("code", () => {
    async function runCode(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "fetch", "code"]).run(taskArguments);
    }

    it("prints the runtime bytecode, at the latest block or --block", async () => {
      await runCode({ address: CONTRACT });
      await runCode({ address: CONTRACT, block: "earliest" });
      await runCode({ address: SENDER });

      // The contract was deployed after the genesis block
      assert.deepEqual(capture.lines, [RUNTIME_CODE, "0x", "0x"]);
    });

    it("throws when the address or --block is invalid", async () => {
      await assertRejectsWithHardhatError(
        runCode({ address: "0x1234" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0x1234",
          name: "address",
          reason: "it must be a valid Ethereum address",
        },
      );

      await assertRejectsWithHardhatError(
        runCode({ address: CONTRACT, block: "first" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "first",
          name: "block",
          reason:
            "it must be a block number, a block hash, or one of latest, pending, earliest, safe and finalized",
        },
      );
    });
  });
});
