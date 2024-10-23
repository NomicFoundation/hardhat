import type { TracingConfig } from "../types/node-types.js";

import {
  VmTraceDecoder,
  initializeVmTraceDecoder,
} from "@ignored/edr-optimism";
import chalk from "chalk";
import debug from "debug";

const log = debug("hardhat:core:hardhat-network:node");

export async function createVmTraceDecoder(): Promise<VmTraceDecoder> {
  return new VmTraceDecoder();
}

export async function initializeVmTraceDecoderWrapper(
  vmTraceDecoder: VmTraceDecoder,
  tracingConfig: TracingConfig,
): Promise<void> {
  try {
    initializeVmTraceDecoder(vmTraceDecoder, tracingConfig);
  } catch (error) {
    console.warn(
      chalk.yellow(
        "The Hardhat Network tracing engine could not be initialized. Run Hardhat with --verbose to learn more.",
      ),
    );

    log(
      "Hardhat Network tracing disabled: VmTraceDecoder failed to be initialized. Please report this to help us improve Hardhat.\n",
      error,
    );

    // TODO: answer what we should do about Sentry
    // if (error instanceof Error) {
    //   Reporter.reportError(error);
    // }
  }
}
