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

// A constructor that stores 42 in slot 0: PUSH1 42 PUSH1 0 SSTORE STOP
const INIT_CODE = "0x602a60005500";

const ZERO = `0x${"0".repeat(64)}`;

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

  describe("storage", () => {
    async function runStorage(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "fetch", "storage"]).run(taskArguments);
    }

    it("prints the slot as 32-byte hex, at the latest block or --block", async () => {
      await runStorage({ address: CONTRACT, slot: 0n });
      await runStorage({ address: CONTRACT, slot: 0n, block: "earliest" });
      await runStorage({ address: CONTRACT, slot: 2n ** 256n - 1n });

      // The contract was deployed after the genesis block
      assert.deepEqual(capture.lines, [
        `0x${"2a".padStart(64, "0")}`,
        ZERO,
        ZERO,
      ]);
    });

    it("throws when the address, slot or --block is invalid", async () => {
      await assertRejectsWithHardhatError(
        runStorage({ address: "0x1234", slot: 0n }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0x1234",
          name: "address",
          reason: "it must be a valid Ethereum address",
        },
      );

      for (const slot of [-1n, 2n ** 256n]) {
        await assertRejectsWithHardhatError(
          runStorage({ address: CONTRACT, slot }),
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
          {
            value: slot.toString(),
            name: "slot",
            reason: "it must be between 0 and 2^256 - 1",
          },
        );
      }

      await assertRejectsWithHardhatError(
        runStorage({ address: CONTRACT, slot: 0n, block: "first" }),
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
