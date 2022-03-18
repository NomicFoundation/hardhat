import { getHardhatProvider } from "../utils";

export interface SnapshotRestorer {
  restore(): Promise<void>;
}

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
          "[hardhat-test-helpers] Trying to restore an invalid snapshot."
        );
      }

      // re-take the snapshot so that `restore` can be called again
      snapshotId = await provider.request({
        method: "evm_snapshot",
      });
    },
  };
}
