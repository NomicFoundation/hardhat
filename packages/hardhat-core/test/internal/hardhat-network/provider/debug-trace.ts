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
  | "traceCall"
  | "precompileCall"
  | "codelessCall"
  | "creation"
  | "creationCall"
  | "revertCall"
  | "singleCall";

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
const RECIPIENT = DEFAULT_ACCOUNTS_ADDRESSES[1];

/** The gas of a transaction that runs no code. */
const INTRINSIC_GAS = 21_000;

/** The wei sent by a value transfer. */
const TRANSFER_VALUE = numberToRpcQuantity(1);

const CALL_TRACER = "callTracer";
const UNSUPPORTED_TRACER = "unsupportedTracer";
/** EDR treats an unknown tracer name as JavaScript code. */
const UNSUPPORTED_TRACER_ERROR = "JS Tracer is not enabled";

/** Hardhat 2's trace of a value transfer. */
const VALUE_TRANSFER_TRACE: RpcDebugTraceOutput = {
  gas: INTRINSIC_GAS,
  failed: false,
  returnValue: "",
  structLogs: [],
};

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
const PRECOMPILE_CALLER_ADDRESS = address(0x113);
const CODELESS_CALLER_ADDRESS = address(0x114);
/** An account that never gets code. */
const CODELESS_ADDRESS = address(0x115);
const SINGLE_CALL_ADDRESS = address(0x116);
const ECRECOVER_PRECOMPILE_ADDRESS = address(0x1);
const IDENTITY_PRECOMPILE_ADDRESS = address(0x4);
const ELONGATED_MEMORY_ADDRESS = "0x1234567890123456789012345678901234567890";

/** The size of an EVM memory word in bytes. */
const WORD_SIZE = 32;

function withoutPrefix(hex: string): string {
  return hex.slice(2);
}

/** Formats a number below 256 as two hex digits, the operand of a PUSH1. */
function hexByte(n: number): string {
  return n.toString(16).padStart(2, "0");
}

/** Returns the size in bytes of unprefixed hex. */
function byteLength(hex: string): number {
  return hex.length / 2;
}

/**
 * Calls `target` with `inputSize` bytes of memory at `inputOffset` as
 * calldata, keeping 32 bytes of its output. `inputOffset` and `inputSize`
 * must each be below 256.
 */
function call(target: string, inputOffset = 0, inputSize = 0): string {
  return `6020600060${hexByte(inputSize)}60${hexByte(
    inputOffset
  )}600073${withoutPrefix(target)}5af150`;
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

/** Sets slot 0 to 1. */
const STORE_SLOT_0 = "6001600055";

/** Loads slot 0 and stops. */
const LOAD_SLOT_0 = "6000545000";

/** Init code that sets slot 0 to 1, loads it and deploys no code. */
const STORAGE_INIT_CODE = `0x${STORE_SLOT_0}${LOAD_SLOT_0}`;

/** Init code that sets slot 0 to 1 and deploys `LOAD_SLOT_0`. */
const SLOT_READER_INIT_CODE = `${STORE_SLOT_0}64${LOAD_SLOT_0}6000526005601bf3`;
const SLOT_READER_INIT_CODE_SIZE = byteLength(SLOT_READER_INIT_CODE);
/** The init code's offset at the end of the first memory word. */
const SLOT_READER_INIT_CODE_OFFSET = WORD_SIZE - SLOT_READER_INIT_CODE_SIZE;

/** Stores the init code at the end of the first memory word. */
const STORE_SLOT_READER_INIT_CODE = `72${SLOT_READER_INIT_CODE}600052`;

/** Calls the address in the second memory word. */
const CALL_STORED_ADDRESS = "600060006000600060006020515af150";

/** Three bytes of calldata. */
const CALL_INPUT = "aabbcc";
const CALL_INPUT_SIZE = byteLength(CALL_INPUT);
/** The calldata's offset at the end of the first memory word. */
const CALL_INPUT_OFFSET = WORD_SIZE - CALL_INPUT_SIZE;

/**
 * Sets slot 0 to 1, calls `target` with `CALL_INPUT` and loads slot 0. The
 * steps after the call show whether it switched the storage context.
 */
function callBetweenStorageAccesses(target: string): string {
  return [
    "0x",
    STORE_SLOT_0,
    `62${CALL_INPUT}600052`,
    call(target, CALL_INPUT_OFFSET, CALL_INPUT_SIZE),
    LOAD_SLOT_0,
  ].join("");
}

const CODE: Record<string, string> = {
  // Increments slot 0, sets slot 1 to 0x42 and returns slot 0.
  [STORAGE_ADDRESS]: "0x600054600101600055604260015560005460005260206000f3",
  // Sets slot 2 to 0x77.
  [LIBRARY_ADDRESS]: "0x607760025500",
  [READER_ADDRESS]: `0x${LOAD_SLOT_0}`,
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
    `60${hexByte(SLOT_READER_INIT_CODE_SIZE)}`,
    `60${hexByte(SLOT_READER_INIT_CODE_OFFSET)}6000f0602052`,
    CALL_STORED_ADDRESS,
    STORE_SLOT_READER_INIT_CODE,
    `600060${hexByte(SLOT_READER_INIT_CODE_SIZE)}`,
    `60${hexByte(SLOT_READER_INIT_CODE_OFFSET)}6000f5602052`,
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
  // Sets slot 0, calls the identity precompile and loads slot 0.
  [PRECOMPILE_CALLER_ADDRESS]: callBetweenStorageAccesses(
    IDENTITY_PRECOMPILE_ADDRESS
  ),
  // Sets slot 0, calls an account without code and loads slot 0.
  [CODELESS_CALLER_ADDRESS]: callBetweenStorageAccesses(CODELESS_ADDRESS),
  // Calls the storage contract once.
  [SINGLE_CALL_ADDRESS]: `0x${call(STORAGE_ADDRESS)}00`,
};

async function setCode(provider: EthereumProvider): Promise<void> {
  for (const [codeAddress, code] of Object.entries(CODE)) {
    await provider.send("hardhat_setCode", [codeAddress, code]);
  }
}

/** Sends a transaction and returns its hash, even if it failed. */
async function sendTransaction(
  provider: EthereumProvider,
  tx: { from?: string; to?: string; data?: string; gas?: string }
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

/** The fields of geth's callTracer output that the tests check. */
interface CallTracerFrame {
  type: string;
  to: string;
  calls: unknown[];
}

/** Asserts that `trace` is the callTracer frame of a call to `MAIN_ADDRESS`. */
function assertMainCallTracerFrame(trace: CallTracerFrame): void {
  assert.equal(trace.type, "CALL");
  assert.equal(trace.to, MAIN_ADDRESS);
  assert.lengthOf(trace.calls, 3);
  assert.notProperty(trace, "structLogs");
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
        async function traceTransaction<Trace = RpcDebugTraceOutput>(
          provider: EthereumProvider,
          txHash: string,
          options?: object
        ): Promise<Trace> {
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
            to: RECIPIENT,
          });

          assert.deepEqual(
            await traceTransaction(this.provider, txHash),
            VALUE_TRANSFER_TRACE
          );
        });

        it("matches Hardhat 2's trace of a contract call", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`,
            RECIPIENT
          );
          const txHash = await sendTransaction(this.provider, {
            from: RECIPIENT,
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
          tx: { from?: string; to?: string; data?: string };
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
          {
            scenario: "precompileCall",
            description: "storage around a CALL to a precompile",
            tx: { to: PRECOMPILE_CALLER_ADDRESS },
          },
          {
            scenario: "codelessCall",
            description: "storage around a CALL to an account without code",
            tx: { to: CODELESS_CALLER_ADDRESS },
          },
          {
            scenario: "creation",
            description: "storage written by a contract-creation transaction",
            tx: { data: STORAGE_INIT_CODE },
          },
          {
            scenario: "singleCall",
            description: "a single nested call",
            tx: { to: SINGLE_CALL_ADDRESS },
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

        it("keeps storage per frame with disableStack when each contract is entered once", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: SINGLE_CALL_ADDRESS,
          });

          assert.deepEqual(
            await traceTransaction(this.provider, txHash, {
              disableStack: true,
            }),
            withoutFields(HARDHAT_2_TRACES.singleCall, ["stack"])
          );
        });

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

        it("returns geth's callTracer output", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          const trace = await traceTransaction<CallTracerFrame>(
            this.provider,
            txHash,
            { tracer: CALL_TRACER }
          );

          assertMainCallTracerFrame(trace);
        });

        it("rejects an unsupported tracer", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: MAIN_ADDRESS,
          });

          await assert.isRejected(
            traceTransaction(this.provider, txHash, {
              tracer: UNSUPPORTED_TRACER,
            }),
            UNSUPPORTED_TRACER_ERROR
          );
        });

        it("returns a failed trace without steps when a precompile call runs out of gas", async function () {
          const txHash = await sendTransaction(this.provider, {
            to: ECRECOVER_PRECOMPILE_ADDRESS,
            gas: numberToRpcQuantity(INTRINSIC_GAS),
          });

          assert.deepEqual(await traceTransaction(this.provider, txHash), {
            ...VALUE_TRANSFER_TRACE,
            failed: true,
          });
        });
      });

      describe("debug_traceCall", function () {
        const CALL = { from: SENDER, to: STORAGE_ADDRESS, gas: TX_GAS };

        const TRACE_CALL_SCENARIOS: Array<{
          scenario: ScenarioName;
          description: string;
          call: { to?: string; data?: string };
        }> = [
          {
            scenario: "reentrancyCall",
            description: "storage written by a reentrant call",
            call: { to: REENTRANCY_ADDRESS },
          },
          {
            scenario: "creationCall",
            description: "a call without a recipient",
            call: { to: undefined, data: STORAGE_INIT_CODE },
          },
          {
            scenario: "revertCall",
            description: "a reverted call",
            call: { to: REVERT_ADDRESS },
          },
        ];

        it("matches Hardhat 2's trace", async function () {
          assert.deepEqual(
            await this.provider.send("debug_traceCall", [CALL, "latest"]),
            HARDHAT_2_TRACES.traceCall
          );
        });

        for (const {
          scenario,
          description,
          call: callFields,
        } of TRACE_CALL_SCENARIOS) {
          it(`matches Hardhat 2's trace of ${description}`, async function () {
            assert.deepEqual(
              await this.provider.send("debug_traceCall", [
                { ...CALL, ...callFields },
                "latest",
              ]),
              HARDHAT_2_TRACES[scenario]
            );
          });
        }

        it("returns an empty trace for value transfers", async function () {
          assert.deepEqual(
            await this.provider.send("debug_traceCall", [
              { ...CALL, to: RECIPIENT, value: TRANSFER_VALUE },
              "latest",
            ]),
            VALUE_TRANSFER_TRACE
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

        it("returns geth's callTracer output", async function () {
          const trace: CallTracerFrame = await this.provider.send(
            "debug_traceCall",
            [{ ...CALL, to: MAIN_ADDRESS }, "latest", { tracer: CALL_TRACER }]
          );

          assertMainCallTracerFrame(trace);
        });

        it("rejects an unsupported tracer", async function () {
          await assert.isRejected(
            this.provider.send("debug_traceCall", [
              CALL,
              "latest",
              { tracer: UNSUPPORTED_TRACER },
            ]),
            UNSUPPORTED_TRACER_ERROR
          );
        });
      });
    });
  });
});
