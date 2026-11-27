import type { NetworkHooks } from "../../../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  captureConsole,
} from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

// The first default account
const SENDER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("hhu utils fetch tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});

    // Each connection is a fresh chain, so the transaction is resent
    const networkHooks: Partial<NetworkHooks> = {
      newConnection: async (context, next) => {
        const connection = await next(context);

        await connection.provider.request({
          method: "eth_sendTransaction",
          params: [{ from: SENDER, to: SENDER }],
        });

        return connection;
      },
    };

    hre.hooks.registerHandlers("network", networkHooks);
  });

  describe("nonce", () => {
    async function runNonce(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "fetch", "nonce"]).run(taskArguments);
    }

    it("prints the nonce in decimal, at the latest block or --block", async () => {
      await runNonce({ address: SENDER });
      await runNonce({ address: SENDER, block: "earliest" });

      // The transaction was mined after the genesis block
      assert.deepEqual(capture.lines, ["1", "0"]);
    });

    it("throws when the address or --block is invalid", async () => {
      await assertRejectsWithHardhatError(
        runNonce({ address: "0x1234" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0x1234",
          name: "address",
          reason: "it must be a valid Ethereum address",
        },
      );

      await assertRejectsWithHardhatError(
        runNonce({ address: SENDER, block: "first" }),
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
