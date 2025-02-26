import type { Fixture, NetworkHelpers, Snapshot } from "../../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

export async function loadFixture<T>(
  networkHelpers: NetworkHelpers,
  fixture: Fixture<T>,
  snapshots: Array<Snapshot<any>>,
): Promise<T> {
  if (fixture.name === "") {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.FIXTURE_ANONYMOUS_FUNCTION_ERROR,
    );
  }

  const snapshot = snapshots.find((s) => s.fixture === fixture);

  if (snapshot !== undefined) {
    try {
      await snapshot.restorer.restore();

      const filteredSnapshots = snapshots.filter(
        (s) =>
          Number(s.restorer.snapshotId) <= Number(snapshot.restorer.snapshotId),
      );

      // Modify the array by reference
      snapshots.length = 0;
      snapshots.push(...filteredSnapshots);
    } catch (e) {
      if (
        HardhatError.isHardhatError(e) &&
        e.number === HardhatError.ERRORS.NETWORK_HELPERS.INVALID_SNAPSHOT.number
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.NETWORK_HELPERS.FIXTURE_SNAPSHOT_ERROR,
        );
      }

      throw e;
    }

    return snapshot.data;
  } else {
    const data = await fixture();
    const restorer = await networkHelpers.takeSnapshot();

    snapshots.push({
      restorer,
      fixture,
      data,
    });

    return data;
  }
}

export function clearSnapshots(snapshots: Array<Snapshot<any>>): void {
  // Modify the array by reference
  snapshots.length = 0;
}
