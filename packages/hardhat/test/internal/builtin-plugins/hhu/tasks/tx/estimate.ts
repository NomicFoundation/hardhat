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

// The identity precompile, which returns its calldata
const IDENTITY = "0x0000000000000000000000000000000000000004";

// Reverts without data
const REVERTER = `0x${"ee".repeat(20)}`;
const REVERTER_CODE = "0x5f5ffd";

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
// The request is built as in `tx call`, whose tests cover its arguments.
describe("hhu utils tx estimate task", () => {
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
          method: "hardhat_setCode",
          params: [REVERTER, REVERTER_CODE],
        });

        return connection;
      },
    };

    hre.hooks.registerHandlers("network", networkHooks);
  });

  async function runEstimate(taskArguments: Record<string, unknown>) {
    await hre.tasks.getTask(["utils", "tx", "estimate"]).run(taskArguments);
  }

  it("prints the gas in decimal, including the calldata's", async () => {
    await runEstimate({ to: IDENTITY, value: 1n });
    await runEstimate({ to: IDENTITY, signature: "f(uint256)", args: ["1"] });

    assert.equal(capture.lines.length, 2);
    assert.match(capture.lines[0], /^\d+$/);
    assert.match(capture.lines[1], /^\d+$/);
    assert.ok(
      Number(capture.lines[0]) >= 21000,
      "it should include the intrinsic gas",
    );
    assert.ok(
      Number(capture.lines[1]) > Number(capture.lines[0]),
      "it should include the calldata",
    );
  });

  it("throws when the transaction reverts", async () => {
    await assertRejectsWithHardhatError(
      runEstimate({ to: REVERTER }),
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      { code: 3, message: "Transaction reverted without a reason string" },
    );
  });
});
