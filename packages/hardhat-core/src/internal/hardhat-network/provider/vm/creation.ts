import { EthContextAdapter } from "../context";
import { HardhatEthContext } from "../context/hardhat";
import { NodeConfig } from "../node-types";
import { RandomBufferGenerator } from "../utils/random";

/**
 * Creates an instance of a EthContextAdapter.
 */
export async function createContext(
  config: NodeConfig
): Promise<EthContextAdapter> {
  const prevRandaoGenerator = RandomBufferGenerator.create("randomMixHashSeed");
  return HardhatEthContext.create(config, prevRandaoGenerator);
}
