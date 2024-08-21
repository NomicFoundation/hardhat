import type { VmTraceDecoder as VmTraceDecoderT } from "@nomicfoundation/edr";
import chalk from "chalk";
import debug from "debug";
import { Reporter } from "../../sentry/reporter";
import { TracingConfig } from "../provider/node-types";
import { requireNapiRsModule } from "../../../common/napi-rs";

const log = debug("hardhat:core:hardhat-network:node");

const { VmTraceDecoder, initializeVmTraceDecoder } = requireNapiRsModule(
  "@nomicfoundation/edr"
) as typeof import("@nomicfoundation/edr");

function initializeVmTraceDecoderWrapper(
  vmTraceDecoder: VmTraceDecoderT,
  tracingConfig: TracingConfig
) {
  try {
    initializeVmTraceDecoder(vmTraceDecoder, tracingConfig);
  } catch (error) {
    console.warn(
      chalk.yellow(
        "The Hardhat Network tracing engine could not be initialized. Run Hardhat with --verbose to learn more."
      )
    );

    log(
      "Hardhat Network tracing disabled: VmTraceDecoder failed to be initialized. Please report this to help us improve Hardhat.\n",
      error
    );

    if (error instanceof Error) {
      Reporter.reportError(error);
    }
  }
}

export {
  VmTraceDecoder,
  VmTraceDecoderT,
  initializeVmTraceDecoderWrapper as initializeVmTraceDecoder,
};
