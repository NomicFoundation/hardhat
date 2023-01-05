import { Common } from "@nomicfoundation/ethereumjs-common";
import { assertHardhatInvariant } from "../../../core/errors";

import { NodeConfig } from "../node-types";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";
import { DualModeAdapter } from "./dual";
import { EthereumJSAdapter } from "./ethereumjs";
import { RethnetAdapter } from "./rethnet";
import { VMAdapter } from "./vm-adapter";

/**
 * Creates an instance of a VMAdapter. Which implementation is used depends on
 * the value of the HARDHAT_EXPERIMENTAL_VM_MODE environment variable.
 */
export function createVm(
  common: Common,
  blockchain: HardhatBlockchainInterface,
  config: NodeConfig,
  selectHardfork: (blockNumber: bigint) => string
): Promise<VMAdapter> {
  const vmModeEnvVar = process.env.HARDHAT_EXPERIMENTAL_VM_MODE;

  if (vmModeEnvVar === "ethereumjs") {
    return EthereumJSAdapter.create(common, blockchain, config, selectHardfork);
  } else if (vmModeEnvVar === "rethnet") {
    return RethnetAdapter.create(
      config,
      selectHardfork,
      async (blockNumber) => {
        const block = await blockchain.getBlock(blockNumber);
        assertHardhatInvariant(block !== null, "Should be able to get block");

        return block.header.hash();
      }
    );
  } else {
    return DualModeAdapter.create(common, blockchain, config, selectHardfork);
  }
}
