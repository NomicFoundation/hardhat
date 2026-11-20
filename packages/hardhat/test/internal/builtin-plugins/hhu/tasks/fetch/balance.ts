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

// The first default account
const SENDER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

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

    // Each connection is a fresh chain, so the transfer is resent. Its value,
    // 10^18 + 1 wei, is beyond 2^53.
    const networkHooks: Partial<NetworkHooks> = {
      newConnection: async (context, next) => {
        const connection = await next(context);

        await connection.provider.request({
          method: "eth_sendTransaction",
          params: [{ from: SENDER, to: ADDRESS, value: "0xde0b6b3a7640001" }],
        });

        return connection;
      },
    };

    hre.hooks.registerHandlers("network", networkHooks);
  });

  describe("balance", () => {
    async function runBalance(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "fetch", "balance"]).run(taskArguments);
    }

    it("prints the balance in wei, in decimal, at the latest block or --block", async () => {
      await runBalance({ address: ADDRESS });
      await runBalance({ address: ADDRESS, block: "earliest" });

      // The transfer was mined after the genesis block
      assert.deepEqual(capture.lines, ["1000000000000000001", "0"]);
    });

    it("throws when the address or --block is invalid", async () => {
      await assertRejectsWithHardhatError(
        runBalance({ address: "0x1234" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0x1234",
          name: "address",
          reason: "it must be a valid Ethereum address",
        },
      );

      await assertRejectsWithHardhatError(
        runBalance({ address: ADDRESS, block: "first" }),
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
