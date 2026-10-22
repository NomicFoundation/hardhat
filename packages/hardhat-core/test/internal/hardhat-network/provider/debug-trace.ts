import { assert } from "chai";
import fsExtra from "fs-extra";
import _ from "lodash";
import path from "path";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import {
  RpcDebugTraceOutput,
  RpcStructLog,
} from "../../../../src/internal/hardhat-network/provider/output";
import { EthereumProvider } from "../../../../types";
import { EXAMPLE_CONTRACT } from "../helpers/contracts";
import { DEFAULT_ACCOUNTS_ADDRESSES, PROVIDERS } from "../helpers/providers";
import { deployContract } from "../helpers/transactions";

type ScenarioName =
  | "modifiesState"
  | "elongatedMemory"
  | "storageContexts"
  | "staticcall"
  | "callcode"
  | "reentrancy"
  | "reentrancyCall"
  | "create"
  | "createAndCall"
  | "revert"
  | "traceCall";

/**
 * Traces recorded with Hardhat 2.29.1 and EDR 0.12.0-next.23, the last
 * release before EDR adopted geth's debug trace format. The recorder used
 * `useProvider`'s defaults, so the shanghai hardfork and chain id 123. The
 * gas values depend on them.
 */
const HARDHAT_2_TRACES: Record<ScenarioName, RpcDebugTraceOutput> =
  fsExtra.readJsonSync(
    path.join(__dirname, "fixture-debug-traces", "hardhat-2.29.1.json")
  );

const TX_GAS = numberToRpcQuantity(1_000_000);
const SENDER = DEFAULT_ACCOUNTS_ADDRESSES[0];

function address(index: number): string {
  return `0x${index.toString(16).padStart(40, "0")}`;
}

const STORAGE_ADDRESS = address(0x105);
const LIBRARY_ADDRESS = address(0x106);
const MAIN_ADDRESS = address(0x107);
const REVERT_ADDRESS = address(0x108);
const CREATE_ADDRESS = address(0x10a);
const REENTRANCY_ADDRESS = address(0x10b);
const STOP_ADDRESS = address(0x10c);
const STATICCALL_ADDRESS = address(0x10d);
const READER_ADDRESS = address(0x10e);
const CALLCODE_ADDRESS = address(0x10f);
const CREATE_AND_CALL_ADDRESS = address(0x110);
const INFINITE_LOOP_ADDRESS = address(0x111);
const UNKNOWN_OPCODE_ADDRESS = address(0x112);
const ELONGATED_MEMORY_ADDRESS = "0x1234567890123456789012345678901234567890";

function withoutPrefix(hex: string): string {
  return hex.slice(2);
}

/** Calls `target` without calldata, keeping 32 bytes of its output. */
function call(target: string): string {
  return `6020600060006000600073${withoutPrefix(target)}5af150`;
}

function staticcall(target: string): string {
  return `600060006000600073${withoutPrefix(target)}5afa50`;
}

function delegatecall(target: string): string {
  return `600060006000600073${withoutPrefix(target)}5af450`;
}

function callcode(target: string): string {
  return `6000600060006000600073${withoutPrefix(target)}5af250`;
}

/** Init code that sets slot 0 to 1 and deploys `PUSH1 0 SLOAD POP STOP`. */
const SLOT_READER_INIT_CODE = "60016000556460005450006000526005601bf3";
/** The init code's size in bytes, as one hex byte. */
const SLOT_READER_INIT_CODE_SIZE = "13";
/** The init code's offset in memory, 32 bytes minus its 19 bytes. */
const SLOT_READER_INIT_CODE_OFFSET = "0d";

/** Stores the init code at the end of the first memory word. */
const STORE_SLOT_READER_INIT_CODE = `72${SLOT_READER_INIT_CODE}600052`;

/** Calls the address in the second memory word. */
const CALL_STORED_ADDRESS = "600060006000600060006020515af150";

const CODE: Record<string, string> = {
  // Increments slot 0, sets slot 1 to 0x42 and returns slot 0.
  [STORAGE_ADDRESS]: "0x600054600101600055604260015560005460005260206000f3",
  // Sets slot 2 to 0x77.
  [LIBRARY_ADDRESS]: "0x607760025500",
  // Loads slot 0.
  [READER_ADDRESS]: "0x6000545000",
  // Loads slot 5, delegatecalls the library, calls the storage contract
  // twice, loads slot 6 and returns the storage contract's output.
  [MAIN_ADDRESS]: [
    "0x60055450",
    delegatecall(LIBRARY_ADDRESS),
    call(STORAGE_ADDRESS),
    call(STORAGE_ADDRESS),
    "6006545060206000f3",
  ].join(""),
  // Calls the reader, then staticcalls it.
  [STATICCALL_ADDRESS]: [
    "0x",
    call(READER_ADDRESS),
    staticcall(READER_ADDRESS),
    "00",
  ].join(""),
  // Loads slot 7, callcodes the library and loads slot 2.
  [CALLCODE_ADDRESS]: [
    "0x60075450",
    callcode(LIBRARY_ADDRESS),
    "6002545000",
  ].join(""),
  // Reverts with 0xaa.
  [REVERT_ADDRESS]: "0x60aa60005260206000fd",
  // Without calldata, sets slot 3 to 1 and calls itself with one byte of
  // calldata. That call sets slots 3 and 4 to 2.
  [REENTRANCY_ADDRESS]: [
    "0x36602f57600160035560006000600160006000",
    `73${withoutPrefix(REENTRANCY_ADDRESS)}5af150600050005b`,
    "6002600355600260045500",
  ].join(""),
  // Creates a contract whose init code sets slot 0.
  [CREATE_ADDRESS]: "0x656001600055006000526006601a6000f05000",
  // Creates a slot reader with CREATE and with CREATE2 and calls each one.
  // Then creates a contract whose init code reverts.
  [CREATE_AND_CALL_ADDRESS]: [
    "0x",
    STORE_SLOT_READER_INIT_CODE,
    `60${SLOT_READER_INIT_CODE_SIZE}`,
    `60${SLOT_READER_INIT_CODE_OFFSET}6000f0602052`,
    CALL_STORED_ADDRESS,
    STORE_SLOT_READER_INIT_CODE,
    `600060${SLOT_READER_INIT_CODE_SIZE}`,
    `60${SLOT_READER_INIT_CODE_OFFSET}6000f5602052`,
    CALL_STORED_ADDRESS,
    "6460006000fd6000526005601b6000f05000",
  ].join(""),
  // JUMPDEST PUSH1 0 JUMP
  [INFINITE_LOOP_ADDRESS]: "0x5b600056",
  // An undefined opcode.
  [UNKNOWN_OPCODE_ADDRESS]: "0x0c",
  // PUSH0 PUSH0 MSTORE PUSH0
  [ELONGATED_MEMORY_ADDRESS]: "0x5F5F525F",
  [STOP_ADDRESS]: "0x00",
};

async function setCode(provider: EthereumProvider): Promise<void> {
  for (const [codeAddress, code] of Object.entries(CODE)) {
    await provider.send("hardhat_setCode", [codeAddress, code]);
  }
}

/** Sends a transaction and returns its hash, even if it failed. */
async function sendTransaction(
  provider: EthereumProvider,
  tx: { from?: string; to: string; data?: string; gas?: string }
): Promise<string> {
  try {
    return await provider.send("eth_sendTransaction", [
      { from: SENDER, gas: TX_GAS, ...tx },
    ]);
  } catch {
    const block = await provider.send("eth_getBlockByNumber", [
      "latest",
      false,
    ]);
    return block.transactions[0];
  }
}

type OptionalStructLogField = "memory" | "stack" | "storage";

function withoutFields(
  trace: RpcDebugTraceOutput,
  fields: OptionalStructLogField[]
): RpcDebugTraceOutput {
  return {
    ...trace,
    structLogs: trace.structLogs.map((log): RpcStructLog =>
      _.omit(log, fields)
    ),
  };
}

describe("Debug module", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      useProvider();

      beforeEach(async function () {
        await setCode(this.provider);
      });

      describe("debug_traceTransaction", function () {
        async function traceTransaction(
          provider: EthereumProvider,
          txHash: string,
          options?: object
        ): Promise<RpcDebugTraceOutput> {
          const params = options === undefined ? [txHash] : [txHash, options];
          return provider.send("debug_traceTransaction", params);
        }

        it("reports a missing transaction hash", async function () {
          await assert.isRejected(
            this.provider.send("debug_traceTransaction", []),
            "invalid length 0"
          );
        });

        it("returns an empty trace for value transfers", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: DEFAULT_ACCOUNTS_ADDRESSES[1],
          });

          assert.deepEqual(await traceTransaction(this.provider, txHash), {
            gas: 21_000,
            failed: false,
            returnValue: "",
            structLogs: [],
          });
        });

        it("matches Hardhat 2's trace of a contract call", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[1]
          );
          const txHash = await sendTransaction(this.provider, {
            from: DEFAULT_ACCOUNTS_ADDRESSES[1],
            to: contractAddress,
            data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
          });

          assert.deepEqual(
            await traceTransaction(this.provider, txHash),
            HARDHAT_2_TRACES.modifiesState
          );
        });

        const SCENARIOS: Array<{
          scenario: ScenarioName;
          description: string;
          tx: { from?: string; to: string };
        }> = [
          {
            scenario: "elongatedMemory",
            description: "memory without superfluous words",
            tx: {
              from: DEFAULT_ACCOUNTS_ADDRESSES[2],
              to: ELONGATED_MEMORY_ADDRESS,
            },
          },
          {
            scenario: "storageContexts",
            description: "storage across DELEGATECALL and CALL",
            tx: { to: MAIN_ADDRESS },
          },
          {
            scenario: "staticcall",
            description: "storage across STATICCALL",
            tx: { to: STATICCALL_ADDRESS },
          },
          {
            scenario: "callcode",
            description: "storage across CALLCODE",
            tx: { to: CALLCODE_ADDRESS },
          },
          {
            scenario: "reentrancy",
            description: "storage written by a reentrant call",
            tx: { to: REENTRANCY_ADDRESS },
          },
          {
            scenario: "create",
            description: "storage written by a created contract",
            tx: { to: CREATE_ADDRESS },
          },
          {
            scenario: "createAndCall",
            description: "calls into contracts created with CREATE and CREATE2",
            tx: { to: CREATE_AND_CALL_ADDRESS },
          },
          {
            scenario: "revert",
            description: "a reverted transaction",
            tx: { to: REVERT_ADDRESS },
          },
        ];

        for (const { scenario, description, tx } of SCENARIOS) {
          it(`matches Hardhat 2's trace of ${description}`, async function () {
            const txHash = await sendTransaction(this.provider, tx);

            assert.deepEqual(
              await traceTransaction(this.provider, txHash),
              HARDHAT_2_TRACES[scenario]
            );
          });
        }

        // Without the stack, storage is exact only when every call keeps the
        // caller's storage context, as in the CALLCODE scenario.
        const DISABLE_OPTIONS: Array<{
          option: string;
          field: OptionalStructLogField;
          scenario: ScenarioName;
          to: string;
        }> = [
          {
            option: "disableMemory",
            field: "memory",
            scenario: "storageContexts",
            to: MAIN_ADDRESS,
          },
          {
            option: "disableStack",
            field: "stack",
            scenario: "callcode",
            to: CALLCODE_ADDRESS,
          },
          {
            option: "disableStorage",
            field: "storage",
            scenario: "storageContexts",
            to: MAIN_ADDRESS,
          },
        ];

        for (const { option, field, scenario, to } of DISABLE_OPTIONS) {
          it(`omits ${field} with ${option}`, async function () {
            const txHash = await sendTransaction(this.provider, { to });

            assert.deepEqual(
              await traceTransaction(this.provider, txHash, { [option]: true }),
              withoutFields(HARDHAT_2_TRACES[scenario], [field])
            );
          });
        }

        it("captures memory with disableMemory set to false", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          assert.deepEqual(
            await traceTransaction(this.provider, txHash, {
              disableMemory: false,
            }),
            HARDHAT_2_TRACES.storageContexts
          );
        });

        it("captures memory with enableMemory set to true", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          assert.deepEqual(
            await traceTransaction(this.provider, txHash, {
              enableMemory: true,
            }),
            HARDHAT_2_TRACES.storageContexts
          );
        });

        it("lets enableMemory take precedence over disableMemory", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          assert.deepEqual(
            await traceTransaction(this.provider, txHash, {
              enableMemory: true,
              disableMemory: true,
            }),
            HARDHAT_2_TRACES.storageContexts
          );
        });

        it("omits memory with enableMemory set to false", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          assert.deepEqual(
            await traceTransaction(this.provider, txHash, {
              enableMemory: false,
            }),
            withoutFields(HARDHAT_2_TRACES.storageContexts, ["memory"])
          );
        });

        it("adds returnData with enableReturnData", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          const trace = await traceTransaction(this.provider, txHash, {
            enableReturnData: true,
          });

          assert.deepEqual(
            {
              ...trace,
              structLogs: trace.structLogs.map((log) =>
                _.omit(log, "returnData")
              ),
            },
            HARDHAT_2_TRACES.storageContexts
          );
          // The last step follows the second call, which returned 2.
          assert.equal(
            trace.structLogs[trace.structLogs.length - 1].returnData,
            `0x${"2".padStart(64, "0")}`
          );
        });

        // Unlike Hardhat 2.29.1, a halting step carries an error.
        it("adds an error to an out-of-gas step, unlike Hardhat 2.29.1", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: INFINITE_LOOP_ADDRESS,
            gas: numberToRpcQuantity(21_100),
          });

          const trace = await traceTransaction(this.provider, txHash);

          assert.isTrue(trace.failed);
          assert.deepEqual(
            trace.structLogs[trace.structLogs.length - 1].error,
            {
              message: "Some(OutOfGas)",
            }
          );
        });

        // EDR's output lacks the opcode byte that Hardhat 2.29.1 put in the
        // name.
        it("names an undefined opcode Unknown, unlike Hardhat 2.29.1", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: UNKNOWN_OPCODE_ADDRESS,
          });

          const trace = await traceTransaction(this.provider, txHash);

          assert.deepEqual(
            trace.structLogs.map((log) => [log.op, log.error]),
            [["Unknown", { message: "Some(OpcodeNotFound)" }]]
          );
        });

        it("keeps a STOP as the first step", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: STOP_ADDRESS,
          });

          const trace = await traceTransaction(this.provider, txHash);

          assert.deepEqual(
            trace.structLogs.map((log) => log.op),
            ["STOP"]
          );
        });

        it("returns geth's output for built-in tracers", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          const trace: any = await traceTransaction(this.provider, txHash, {
            tracer: "callTracer",
          });

          assert.equal(trace.type, "CALL");
          assert.equal(trace.to, MAIN_ADDRESS);
          assert.lengthOf(trace.calls, 3);
          assert.notProperty(trace, "structLogs");
        });
      });

      describe("debug_traceCall", function () {
        const CALL = { from: SENDER, to: STORAGE_ADDRESS, gas: TX_GAS };

        it("matches Hardhat 2's trace", async function () {
          assert.deepEqual(
            await this.provider.send("debug_traceCall", [CALL, "latest"]),
            HARDHAT_2_TRACES.traceCall
          );
        });

        it("matches Hardhat 2's trace of storage written by a reentrant call", async function () {
          assert.deepEqual(
            await this.provider.send("debug_traceCall", [
              { ...CALL, to: REENTRANCY_ADDRESS },
              "latest",
            ]),
            HARDHAT_2_TRACES.reentrancyCall
          );
        });

        it("matches Hardhat 2's trace without a block tag", async function () {
          assert.deepEqual(
            await this.provider.send("debug_traceCall", [CALL]),
            HARDHAT_2_TRACES.traceCall
          );
        });

        it("omits memory, stack and storage when disabled", async function () {
          const trace = await this.provider.send("debug_traceCall", [
            CALL,
            "latest",
            { disableMemory: true, disableStack: true, disableStorage: true },
          ]);

          assert.deepEqual(
            trace,
            withoutFields(HARDHAT_2_TRACES.traceCall, [
              "memory",
              "stack",
              "storage",
            ])
          );
        });
      });
    });
  });
});
