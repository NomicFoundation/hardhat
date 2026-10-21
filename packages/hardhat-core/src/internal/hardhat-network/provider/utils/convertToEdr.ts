import type {
  ChainOverride,
  L1Hardfork,
  MineOrdering,
  IntervalRange,
  TracingMessage,
  TracingMessageResult,
  TracingStep,
  HttpHeader,
} from "@nomicfoundation/edr";
import type { HardhatNetworkChainsConfig } from "../../../../types";
import { Address } from "@ethereumjs/util";

import { requireNapiRsModule } from "../../../../common/napi-rs";
import { getHardforkName, HardforkName } from "../../../util/hardforks";
import { IntervalMiningConfig, MempoolOrder } from "../node-types";
import {
  MinimalEVMResult,
  MinimalInterpreterStep,
  MinimalMessage,
} from "../vm/types";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export function edrSpecIdToEthereumHardfork(specId: L1Hardfork): HardforkName {
  const { l1HardforkToString } = requireNapiRsModule(
    "@nomicfoundation/edr"
  ) as typeof import("@nomicfoundation/edr");

  // EDR's hardfork names match Hardhat's, so no conversion is needed.
  return l1HardforkToString(specId) as HardforkName;
}

export function ethereumjsIntervalMiningConfigToEdr(
  config: IntervalMiningConfig
): bigint | IntervalRange | undefined {
  if (typeof config === "number") {
    // Is interval mining disabled?
    if (config === 0) {
      return undefined;
    } else {
      return BigInt(config);
    }
  } else {
    return {
      min: BigInt(config[0]),
      max: BigInt(config[1]),
    };
  }
}

export function ethereumjsMempoolOrderToEdrMineOrdering(
  mempoolOrder: MempoolOrder
): MineOrdering {
  const { MineOrdering } = requireNapiRsModule(
    "@nomicfoundation/edr"
  ) as typeof import("@nomicfoundation/edr");

  switch (mempoolOrder) {
    case "fifo":
      return MineOrdering.Fifo;
    case "priority":
      return MineOrdering.Priority;
  }
}

export function edrTracingStepToMinimalInterpreterStep(
  step: TracingStep
): MinimalInterpreterStep {
  const minimalInterpreterStep: MinimalInterpreterStep = {
    pc: step.pc,
    depth: step.depth,
    opcode: {
      name: step.opcode.name,
    },
    stack: step.stack,
    memory: step.memory,
  };

  return minimalInterpreterStep;
}

export function edrTracingMessageResultToMinimalEVMResult(
  tracingMessageResult: TracingMessageResult
): MinimalEVMResult {
  const execResult = tracingMessageResult.execResult;

  const minimalEVMResult: MinimalEVMResult = {
    execResult: {
      success: execResult.success,
      executionGasUsed: execResult.executionGasUsed,
      contractAddress:
        execResult.contractAddress !== undefined
          ? new Address(execResult.contractAddress)
          : undefined,
      reason: execResult.reason,
      output:
        execResult.output !== undefined
          ? Buffer.from(execResult.output)
          : undefined,
    },
  };

  return minimalEVMResult;
}

export function edrTracingMessageToMinimalMessage(
  message: TracingMessage
): MinimalMessage {
  return {
    to: message.to !== undefined ? new Address(message.to) : undefined,
    codeAddress:
      message.codeAddress !== undefined
        ? new Address(message.codeAddress)
        : undefined,
    data: message.data,
    value: message.value,
    caller: new Address(message.caller),
    gasLimit: message.gasLimit,
    isStaticCall: message.isStaticCall,
  };
}

export function httpHeadersToEdr(input?: {
  [name: string]: string;
}): HttpHeader[] | undefined {
  let httpHeaders: HttpHeader[] | undefined;
  if (input !== undefined) {
    httpHeaders = [];

    for (const [name, value] of Object.entries(input)) {
      httpHeaders.push({
        name,
        value,
      });
    }
  }

  return httpHeaders;
}

/**
 * Converts `networks.hardhat.chains` to EDR chain overrides.
 *
 * An empty hardfork history is omitted, so that EDR keeps its built-in
 * activations for that chain.
 */
export function hardhatChainsToEdrChainOverrides(
  chains: HardhatNetworkChainsConfig
): ChainOverride[] {
  return Array.from(chains, ([chainId, { hardforkHistory }]) => {
    const chainOverride: ChainOverride = {
      chainId: BigInt(chainId),
      name: "Unknown",
    };

    if (hardforkHistory.size > 0) {
      chainOverride.hardforkActivationOverrides = Array.from(
        hardforkHistory,
        ([hardfork, blockNumber]) => ({
          condition: { blockNumber: BigInt(blockNumber) },
          hardfork: getHardforkName(hardfork),
        })
      );
    }

    return chainOverride;
  });
}
