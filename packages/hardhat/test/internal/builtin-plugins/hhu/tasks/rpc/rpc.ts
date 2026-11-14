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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = `0x${"0".repeat(64)}`;

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
describe("hhu utils rpc task", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment(
      { plugins: [hhu] },
      {},
      process.cwd(),
    );
  });

  async function runRpc(method: string, params: string[] = []) {
    await hre.tasks.getTask(["utils", "rpc"]).run({ method, params });
  }

  it("prints the result as JSON, leaving hex quantities as they are", async () => {
    await runRpc("eth_chainId");

    assert.deepEqual(capture.lines, ['"0x7a69"']);
  });

  it("sends params that are valid JSON as JSON", async () => {
    // The node rejects the string "false", as it expects a boolean.
    await runRpc("eth_getBlockByNumber", ['"latest"', "false"]);

    assert.equal(capture.lines.length, 1);
    assert.match(capture.lines[0], /^\{.*"number":"0x0".*\}$/);
  });

  it("sends params that aren't valid JSON as strings", async () => {
    await runRpc("eth_getBalance", [ZERO_ADDRESS, "latest"]);

    assert.deepEqual(capture.lines, ['"0x0"']);
  });

  it("sends integers beyond 2^53 exactly", async () => {
    // This init code returns its call value
    await runRpc("eth_call", [
      '{"data":"0x3460005260206000f3","value":1000000000000000001}',
    ]);

    assert.deepEqual(capture.lines, [
      `"0x${(10n ** 18n + 1n).toString(16).padStart(64, "0")}"`,
    ]);
  });

  it("prints a null result as null", async () => {
    await runRpc("eth_getTransactionByHash", [ZERO_HASH]);

    assert.deepEqual(capture.lines, ["null"]);
  });

  it("throws when the node returns an error", async () => {
    await assertRejectsWithHardhatError(
      runRpc("foo_bar"),
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      {
        code: -32004,
        message: "Method foo_bar is not supported",
      },
    );

    // Reverts are thrown as a different error class, whose message already
    // decodes their data. This init code reverts.
    await assertRejectsWithHardhatError(
      runRpc("eth_call", ['{"data":"0x60006000fd"}']),
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      {
        code: 3,
        message: "Transaction reverted without a reason string",
      },
    );
  });
});
