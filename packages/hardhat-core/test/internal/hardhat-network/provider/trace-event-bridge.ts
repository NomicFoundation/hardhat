import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { EIP1193Provider, EthereumProvider } from "../../../../types";
import { DEFAULT_ACCOUNTS_ADDRESSES, PROVIDERS } from "../helpers/providers";

interface VmEventCounts {
  steps: number;
  beforeMessages: number;
  afterMessages: number;
}

const TX_GAS = numberToRpcQuantity(0x100000);
const SENDER = DEFAULT_ACCOUNTS_ADDRESSES[0];

/** Init code that runs PUSH1 1, PUSH1 2, PUSH1 3 and STOP. */
const FOUR_STEP_INIT_CODE = "0x60016002600300";

/** The single message of `FOUR_STEP_INIT_CODE` and its four steps. */
const FOUR_STEP_EVENT_COUNTS: VmEventCounts = {
  steps: 4,
  beforeMessages: 1,
  afterMessages: 1,
};

/**
 * Init code that pushes five zeros as the return and argument ranges and
 * the value, then pushes the identity precompile's address and 0xffff gas.
 * It then runs CALL and STOP.
 */
const IDENTITY_PRECOMPILE_CALL_INIT_CODE =
  "0x60006000600060006000600461fffff100";

/**
 * The creation message and the precompile call message. A precompile runs no
 * steps, so all nine steps belong to the init code.
 */
const IDENTITY_PRECOMPILE_CALL_EVENT_COUNTS: VmEventCounts = {
  steps: 9,
  beforeMessages: 2,
  afterMessages: 2,
};

async function sendTransactionCountingVmEvents(
  hardhatNetworkProvider: EIP1193Provider,
  provider: EthereumProvider,
  data: string
): Promise<VmEventCounts> {
  const counts: VmEventCounts = {
    steps: 0,
    beforeMessages: 0,
    afterMessages: 0,
  };
  const vmEvents = (hardhatNetworkProvider as any)._node._vm.evm.events;
  vmEvents.on("step", () => {
    counts.steps += 1;
  });
  vmEvents.on("beforeMessage", () => {
    counts.beforeMessages += 1;
  });
  vmEvents.on("afterMessage", () => {
    counts.afterMessages += 1;
  });

  await provider.send("eth_sendTransaction", [
    { from: SENDER, data, gas: TX_GAS },
  ]);

  // The minimal VM emits through an AsyncEventEmitter, whose listeners run on
  // a later tick.
  await new Promise((resolve) => setImmediate(resolve));

  return counts;
}

describe("Trace-event bridge", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      useProvider();

      it("emits step, beforeMessage and afterMessage events for a transaction", async function () {
        const counts = await sendTransactionCountingVmEvents(
          this.hardhatNetworkProvider,
          this.provider,
          FOUR_STEP_INIT_CODE
        );

        assert.deepEqual(counts, FOUR_STEP_EVENT_COUNTS);
      });

      it("emits beforeMessage and afterMessage events for a precompile call", async function () {
        const counts = await sendTransactionCountingVmEvents(
          this.hardhatNetworkProvider,
          this.provider,
          IDENTITY_PRECOMPILE_CALL_INIT_CODE
        );

        assert.deepEqual(counts, IDENTITY_PRECOMPILE_CALL_EVENT_COUNTS);
      });
    });
  });
});
