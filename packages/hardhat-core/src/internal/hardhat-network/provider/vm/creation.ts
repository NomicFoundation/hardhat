import { EthContextAdapter } from "../context";
import { DualEthContext } from "../context/dual";
import { HardhatEthContext } from "../context/hardhat";
import { RethnetEthContext } from "../context/rethnet";
import { NodeConfig } from "../node-types";
import { RandomBufferGenerator } from "../utils/random";

/**
 * Creates an instance of a EthContextAdapter. Which implementation is used depends on
 * the value of the HARDHAT_EXPERIMENTAL_VM_MODE environment variable.
 */
export async function createContext(
  config: NodeConfig
): Promise<EthContextAdapter> {
  const vmModeEnvVar = process.env.HARDHAT_EXPERIMENTAL_VM_MODE;

  const prevRandaoGenerator = RandomBufferGenerator.create("randomMixHashSeed");

  // throw if transient storage is enabled and the mode is not ethereumjs
  if (config.enableTransientStorage && vmModeEnvVar !== "ethereumjs") {
    // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
    throw new Error(
      "Transient storage is only supported in ethereumjs mode. Please set HARDHAT_EXPERIMENTAL_VM_MODE=ethereumjs"
    );
  }

  if (vmModeEnvVar === "ethereumjs") {
    return HardhatEthContext.create(config, prevRandaoGenerator);
  } else if (vmModeEnvVar === "rethnet") {
    return RethnetEthContext.create(config);
  } else {
    return DualEthContext.create(config, prevRandaoGenerator);
  }
}
