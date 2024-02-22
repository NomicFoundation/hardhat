import _ from "lodash";

import { ethers } from "ethers";
import { trace as contractAGetMessageTrace } from "../../../../../fixture-debug-traces/traceCall/contractAGetMessage";
import { trace as contractAGetMessageTraceDebugConfig } from "../../../../../fixture-debug-traces/traceCall/contractAGetMessageDebugConfig";
import { trace as ethTransferTrace } from "../../../../../fixture-debug-traces/traceCall/ethTransfer";
import { trace as contractAThrowError } from "../../../../../fixture-debug-traces/traceCall/contractAThrowError";
import { assertInvalidArgumentsError } from "../../../helpers/assertions";
import {
  DEBUG_TRACE_CALL_CONTRACT_A,
  STATE_OVERRIDE_SET_CONTRACT_B,
} from "../../../helpers/contracts";
import { setCWD } from "../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../helpers/providers";
import { deployContract } from "../../../helpers/transactions";
import { assertEqualTraces } from "../../utils/assertEqualTraces";
import { numberToRpcQuantity } from "../../../../../../src/internal/core/jsonrpc/types/base-types";

// Set the base quantity to the value used in GETH to generate the traces
const BASE_GAS_QUANTITY = numberToRpcQuantity(50000000);

describe("Debug module", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("debug_traceCall", function () {
        const deployerAddress = DEFAULT_ACCOUNTS_ADDRESSES[2];
        let contractAAddress: string;

        beforeEach(async function () {
          contractAAddress = await deployContract(
            this.provider,
            `0x${DEBUG_TRACE_CALL_CONTRACT_A.bytecode.object}`
          );
        });

        it("should get the correct trace when calling a function from contract A", async function () {
          const trace = await this.provider.send("debug_traceCall", [
            {
              from: deployerAddress,
              to: contractAAddress,
              data: DEBUG_TRACE_CALL_CONTRACT_A.selectors.getMessage,
              gas: BASE_GAS_QUANTITY,
            },
            "latest",
          ]);

          assertEqualTraces(trace, contractAGetMessageTrace);
        });

        it("should get the correct trace when calling a function from contract A and the blockTag is not defined (default value = latest)", async function () {
          const trace = await this.provider.send("debug_traceCall", [
            {
              from: deployerAddress,
              to: contractAAddress,
              data: DEBUG_TRACE_CALL_CONTRACT_A.selectors.getMessage,
              gas: BASE_GAS_QUANTITY,
            },
            // blockTag not defined, it should automatically default to "latest"
          ]);

          assertEqualTraces(trace, contractAGetMessageTrace);
        });

        it("should get the correct trace when calling a function from contract A with  a specific rpcDebugTracingConfig", async function () {
          const trace = await this.provider.send("debug_traceCall", [
            {
              from: deployerAddress,
              to: contractAAddress,
              data: DEBUG_TRACE_CALL_CONTRACT_A.selectors.getMessage,
              gas: BASE_GAS_QUANTITY,
            },
            "latest",
            // Set a specific rpcDebugTracingConfig configuration
            {
              disableStorage: true,
              disableMemory: true,
              disableStack: true,
            },
          ]);

          assertEqualTraces(trace, contractAGetMessageTraceDebugConfig);
        });

        it("should get the correct error trace when calling a function from contract A that throws an error", async function () {
          const abiCoder = new ethers.AbiCoder();
          // The number should be >= 5. If not, an error will be thrown
          const encodedParameter = abiCoder.encode(["uint256"], [1]).slice(2);

          const trace = await this.provider.send("debug_traceCall", [
            {
              from: deployerAddress,
              to: contractAAddress,
              data: `${DEBUG_TRACE_CALL_CONTRACT_A.selectors.requireGreaterThanFive}${encodedParameter}`,
              gas: BASE_GAS_QUANTITY,
            },
            "latest",
          ]);

          assertEqualTraces(trace, contractAThrowError);
        });

        it("should get the correct trace when performing an ETH transfer between addresses", async function () {
          const trace = await this.provider.send("debug_traceCall", [
            {
              from: deployerAddress,
              to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              value: "0x12",
            },
            "latest",
          ]);

          assertEqualTraces(trace, ethTransferTrace);
        });

        it("Should throw an error when the value passed as tracer is not supported (3rd parameter)", async function () {
          await assertInvalidArgumentsError(
            this.provider,
            "debug_traceCall",
            [
              {
                from: deployerAddress,
                to: contractAAddress,
                data: STATE_OVERRIDE_SET_CONTRACT_B.selectors.getMessage,
              },
              "latest",
              {
                tracer: "unsupportedTracer",
              },
            ],
            "Hardhat currently only supports the default tracer, so no tracer parameter should be passed."
          );
        });
      });
    });
  });
});
