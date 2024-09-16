import type { Fixture, Snapshot } from "./types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

let snapshots: Array<Snapshot<any>> = [];

/**
 * Loads a fixture and restores the blockchain to a snapshot state for repeated tests.
 *
 * The `loadFixture` function is useful in tests where you need to set up the blockchain to a desired state
 * (like deploying contracts, minting tokens, etc.) and then run multiple tests based on that state.
 *
 * It executes the given fixture function, which should set up the blockchain state, and takes a snapshot of the blockchain.
 * On subsequent calls to `loadFixture` with the same fixture function, the blockchain is restored to that snapshot
 * rather than executing the fixture function again.
 *
 * ### Important:
 * - **Do not pass anonymous functions** as the fixture function. Passing an anonymous function like
 *   `loadFixture(async () => { ... })` will bypass the snapshot mechanism and result in the fixture being executed
 *   each time. Instead, always pass a named function, like `loadFixture(deployTokens)`.
 *
 * - Correct usage: `loadFixture(deployTokens, provider)`
 * - Incorrect usage: `loadFixture(async () => { ... }, provider)`
 *
 * @param fixture - A named asynchronous function that sets up the desired blockchain state and returns the fixture's data.
 * @param provider - An instance of an Ethereum provider that interacts with the blockchain.
 * @returns A promise that resolves to the data returned by the fixture, either from execution or a restored snapshot.
 */
export async function loadFixture<T>(
  fixture: Fixture<T>,
  provider: EthereumProvider,
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

      snapshots = snapshots.filter(
        (s) =>
          Number(s.restorer.snapshotId) <= Number(snapshot.restorer.snapshotId),
      );
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
    const { NetworkHelpers } = await import(
      "./internal/network-helpers/network-helpers.js"
    );
    const networkHelpers = new NetworkHelpers(provider);

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

/**
 * Clears every existing snapshot.
 */
export function clearSnapshots(): void {
  snapshots = [];
}
