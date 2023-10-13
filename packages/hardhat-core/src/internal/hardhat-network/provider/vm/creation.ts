import { EthContextAdapter } from "../context";
import { DualEthContext } from "../context/dual";
import { HardhatEthContext } from "../context/hardhat";
import { EdrEthContext } from "../context/edr";
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

  if (vmModeEnvVar === "edr") {
    return EdrEthContext.create(config);
  } else if (vmModeEnvVar === "dual") {
    return DualEthContext.create(config, prevRandaoGenerator);
  } else {
    return HardhatEthContext.create(config, prevRandaoGenerator);
  }
}
