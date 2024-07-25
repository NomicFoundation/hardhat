import chalk from "chalk";
import debug from "debug";
import { VmTraceDecoder, initializeVmTraceDecoder } from "@nomicfoundation/edr";
import { Reporter } from "../../sentry/reporter";
import { TracingConfig } from "../provider/node-types";

const log = debug("hardhat:core:hardhat-network:node");

function initializeVmTraceDecoderWrapper(
  vmTraceDecoder: VmTraceDecoder,
  tracingConfig: TracingConfig
) {
  try {
    initializeVmTraceDecoder(vmTraceDecoder, tracingConfig);
  } catch (error) {
    console.warn(JSON.stringify(error, null, 2), (error as any).message);
    console.warn(
      chalk.yellow(
        "The Hardhat Network tracing engine could not be initialized. Run Hardhat with --verbose to learn more."
      )
    );

    log(
      "Hardhat Network tracing disabled: ContractsIdentifier failed to be initialized. Please report this to help us improve Hardhat.\n",
      error
    );

    if (error instanceof Error) {
      Reporter.reportError(error);
    }
  }
}

export {
  VmTraceDecoder,
  initializeVmTraceDecoderWrapper as initializeVmTraceDecoder,
};
