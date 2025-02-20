import type { SnapshotRestorer } from "../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

export async function takeSnapshot(
  provider: EthereumProvider,
): Promise<SnapshotRestorer> {
  let snapshotId = await provider.request({
    method: "evm_snapshot",
  });

  if (typeof snapshotId !== "string") {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.EVM_SNAPSHOT_VALUE_NOT_A_STRING,
    );
  }

  return {
    restore: async () => {
      const reverted = await provider.request({
        method: "evm_revert",
        params: [snapshotId],
      });

      if (typeof reverted !== "boolean") {
        throw new HardhatError(
          HardhatError.ERRORS.NETWORK_HELPERS.EVM_REVERT_VALUE_NOT_A_BOOLEAN,
        );
      }

      if (!reverted) {
        throw new HardhatError(
          HardhatError.ERRORS.NETWORK_HELPERS.INVALID_SNAPSHOT,
        );
      }

      // Re-take the snapshot so that `restore` can be called again
      snapshotId = await provider.request({
        method: "evm_snapshot",
      });
    },
    snapshotId,
  };
}
