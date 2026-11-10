import type { NetworkHooks } from "../../../../../../src/types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
  captureConsole,
} from "@nomicfoundation/hardhat-test-utils";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import hhu from "../../../../../../src/internal/builtin-plugins/hhu/index.js";
import { buildCallRequest } from "../../../../../../src/internal/builtin-plugins/hhu/tasks/tx/request.js";
import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

const ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const LOWERCASE_ADDRESS = ADDRESS.toLowerCase();
const BAD_CHECKSUM_ADDRESS = "0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

// Returns its calldata without the selector, so a signature whose return types
// match its parameters gets its arguments back
const ECHO = `0x${"ec".repeat(20)}`;
const ECHO_CODE = "0x600436038060045f375ff3";

// Returns abi.encode(msg.sender, msg.value)
const CONTEXT = `0x${"c0".repeat(20)}`;
const CONTEXT_CODE = "0x335f523460205260405ff3";

// Returns abi.encode(block.number)
const BLOCK_NUMBER = `0x${"b0".repeat(20)}`;
const BLOCK_NUMBER_CODE = "0x435f5260205ff3";

// Reverts without data
const REVERTER = `0x${"ee".repeat(20)}`;
const REVERTER_CODE = "0x5f5ffd";

function word(value: bigint | string): string {
  return BigInt(value).toString(16).padStart(64, "0");
}

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
// Decoding and printing are covered by the hardhat-utils and format tests;
// these cover the request and the output.
describe("hhu utils tx call task", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment(
      { plugins: [hhu] },
      {},
      process.cwd(),
    );

    // Each connection is a fresh chain, so the contracts are redeployed
    const networkHooks: Partial<NetworkHooks> = {
      newConnection: async (context, next) => {
        const connection = await next(context);

        for (const [address, code] of [
          [ECHO, ECHO_CODE],
          [CONTEXT, CONTEXT_CODE],
          [BLOCK_NUMBER, BLOCK_NUMBER_CODE],
          [REVERTER, REVERTER_CODE],
        ]) {
          await connection.provider.request({
            method: "hardhat_setCode",
            params: [address, code],
          });
        }

        return connection;
      },
    };

    hre.hooks.registerHandlers("network", networkHooks);
  });

  async function runCall(taskArguments: Record<string, unknown>) {
    await hre.tasks.getTask(["utils", "tx", "call"]).run(taskArguments);
  }

  it("prints the return data as hex when the signature has no return types", async () => {
    await runCall({ to: ECHO, signature: "f(uint256)", args: ["42"] });

    assert.deepEqual(capture.lines, [`0x${word(42n)}`]);
  });

  it("decodes the return data and prints each value on its own line", async () => {
    const types = "uint256,int8,bool,address,string,bytes";

    await runCall({
      to: ECHO,
      signature: `f(${types})(${types})`,
      args: ["1000000000000000000000", "-5", "true", ADDRESS, "hi", "0xbeef"],
    });

    assert.deepEqual(capture.lines, [
      "1000000000000000000000",
      "-5",
      "true",
      LOWERCASE_ADDRESS,
      "hi",
      "0xbeef",
    ]);
  });

  it("prints arrays and tuples as JSON, with exact integers", async () => {
    const types = "(uint256,string,bytes2),uint256[][]";

    await runCall({
      to: ECHO,
      signature: `f(${types}) returns (${types})`,
      args: ['[1,"hi","0xbeef"]', "[[9007199254740993],[]]"],
    });

    assert.deepEqual(capture.lines, [
      '[1,"hi","0xbeef"]',
      "[[9007199254740993],[]]",
    ]);
  });

  it("sends --data as the calldata", async () => {
    await runCall({ to: ECHO, data: "0x12345678beef" });

    assert.deepEqual(capture.lines, ["0xbeef"]);
  });

  it("accepts all-lowercase and all-uppercase addresses, without a checksum", async () => {
    await runCall({
      to: `0x${"EC".repeat(20)}`,
      from: LOWERCASE_ADDRESS,
      data: "0x12345678beef",
    });

    assert.deepEqual(capture.lines, ["0xbeef"]);
  });

  it("lowercases 0X-prefixed addresses and --data, as some nodes reject them", async () => {
    // EDR accepts them, so the request is checked instead of the result
    const { params } = await buildCallRequest({
      to: `0X${"EC".repeat(20)}`,
      from: `0X${ADDRESS.slice(2)}`,
      data: "0X12345678BEEF",
      args: [],
      value: 0n,
      block: "latest",
    });

    assert.deepEqual(params, [
      {
        to: ECHO,
        from: LOWERCASE_ADDRESS,
        data: "0x12345678beef",
        value: "0x0",
      },
      "latest",
    ]);
  });

  it("sends no calldata without a signature nor --data", async () => {
    await runCall({ to: CONTEXT, from: ADDRESS });

    assert.deepEqual(capture.lines, [`0x${word(ADDRESS)}${word(0n)}`]);
  });

  it("sends --from and --value", async () => {
    await runCall({
      to: CONTEXT,
      signature: "f()(address,uint256)",
      from: ADDRESS,
      value: 16n,
    });

    assert.deepEqual(capture.lines, [LOWERCASE_ADDRESS, "16"]);
  });

  it("runs the call on the --block tag, number or hash", async () => {
    const signature = "f()(uint256)";

    const connection = await hre.network.create();
    const genesis = await connection.provider.request({
      method: "eth_getBlockByNumber",
      params: ["0x0", false],
    });
    await connection.close();

    assert.ok(
      isObject(genesis) && typeof genesis.hash === "string",
      "eth_getBlockByNumber should return the genesis block",
    );

    for (const block of ["pending", "latest", "0", "0x00", genesis.hash]) {
      await runCall({ to: BLOCK_NUMBER, signature, block });
    }

    // The pending block is the one after the latest, the genesis block
    assert.deepEqual(capture.lines, ["1", "0", "0", "0", "0"]);

    // A number is sent as a hex quantity, which the node checks
    await assertRejectsWithHardhatError(
      runCall({ to: BLOCK_NUMBER, signature, block: "10" }),
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      {
        code: -32000,
        message: "Received invalid block tag 10. Latest block number is 0",
      },
    );
  });

  it("throws when the call reverts", async () => {
    await assertRejectsWithHardhatError(
      runCall({ to: REVERTER }),
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      { code: 3, message: "Transaction reverted without a reason string" },
    );
  });

  it("throws when the return data can't be decoded as the return types", async () => {
    await assertRejects(
      runCall({ to: ECHO, signature: "f(uint256)(bool)", args: ["2"] }),
      (error) =>
        HardhatError.isHardhatError(
          error,
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        ) && error.messageArguments.name === "signature",
      "expected an invalid signature error",
    );

    await assertRejectsWithHardhatError(
      runCall({ to: ECHO, signature: "f(uint256)(IPool)", args: ["1"] }),
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      {
        value: "f(uint256)(IPool)",
        name: "signature",
        reason: `the return data can't be decoded as its return types: the type "IPool" is not supported; write structs as tuples like (address,uint256), contracts as address, enums as uint8 and user-defined value types as their underlying type. Run the command without return types to see the raw data`,
      },
    );
  });

  it("throws for the recipient when a call with return types returns no data", async () => {
    // An address without code, and the echo contract called without arguments
    for (const to of [ADDRESS, ECHO]) {
      await assertRejectsWithHardhatError(
        runCall({ to, signature: "f()(uint256)" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: to,
          name: "to",
          reason:
            "the call returned no data; check that it's a contract on the selected network and that it has this function",
        },
      );
    }
  });

  it("throws when --data is used together with a signature", async () => {
    await assertRejectsWithHardhatError(
      runCall({ to: ECHO, signature: "f()", data: "0x" }),
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      {
        value: "0x",
        name: "data",
        reason: "it can't be used together with a signature",
      },
    );
  });

  it("throws when an address or --data is invalid", async () => {
    await assertRejectsWithHardhatError(
      runCall({ to: "0x1234" }),
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      {
        value: "0x1234",
        name: "to",
        reason: "it must be a valid Ethereum address",
      },
    );

    await assertRejectsWithHardhatError(
      runCall({ to: ECHO, from: "me" }),
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      {
        value: "me",
        name: "from",
        reason: "it must be a valid Ethereum address",
      },
    );

    for (const name of ["to", "from"]) {
      await assertRejectsWithHardhatError(
        runCall({ to: ECHO, [name]: BAD_CHECKSUM_ADDRESS }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: BAD_CHECKSUM_ADDRESS,
          name,
          reason: "it has an invalid address checksum",
        },
      );
    }

    for (const data of ["1234", "0x123", "0xzz"]) {
      await assertRejectsWithHardhatError(
        runCall({ to: ECHO, data }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: data,
          name: "data",
          reason: "it must be 0x-hex with an even number of digits",
        },
      );
    }
  });
});
