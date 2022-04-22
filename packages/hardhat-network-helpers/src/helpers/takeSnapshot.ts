import { getHardhatProvider } from "../utils";

export interface SnapshotRestorer {
  /**
   * Resets the state of the blockchain to the point in which the snapshot was
   * taken.
   */
  restore(): Promise<void>;
}

/**
 * Takes a snapshot of the state of the blockchain at the current block.
 *
 * Returns an object with a `restore` method that can be used to reset the
 * network to this state.
 */
export async function takeSnapshot(): Promise<SnapshotRestorer> {
  const provider = await getHardhatProvider();

  let snapshotId = await provider.request({
    method: "evm_snapshot",
  });

  return {
    restore: async () => {
      const reverted = await provider.request({
        method: "evm_revert",
        params: [snapshotId],
      });

      if (!reverted) {
        // TODO better error message, and maybe a link to an explanation about
        // what's going on
        throw new Error(
          "[hardhat-network-helpers] Trying to restore an invalid snapshot."
        );
      }

      // re-take the snapshot so that `restore` can be called again
      snapshotId = await provider.request({
        method: "evm_snapshot",
      });
    },
  };
}
