import type { SnapshotRestorer } from "./helpers/takeSnapshot";

import { FixtureSnapshotError, InvalidSnapshotError } from "./errors";

type Fixture<T> = () => Promise<T>;

interface Snapshot<T> {
  restorer: SnapshotRestorer;
  fixture: Fixture<T>;
  data: T;
}

const snapshots: Array<Snapshot<any>> = [];

/**
 * Executes the given function and takes a snapshot of the blockchain. Each
 * time `loadFixture` is called again with the same function, the blockchain
 * will be restored to that snapshot instead of executing the function again.
 *
 * Useful for `beforeEach` hooks that setup the desired state of the network.
 *
 * *Warning*: don't use `loadFixture` with an anonymous function, otherwise the
 * function will be executed each time instead of using snapshots:
 *
 * - Correct usage: `loadFixture(deployTokens)`
 * - Incorrect usage: `loadFixture(async () => { ... })`
 */
export async function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
  const snapshot = snapshots.find((s) => s.fixture === fixture);

  const { takeSnapshot } = await import("./helpers/takeSnapshot");

  if (snapshot !== undefined) {
    try {
      await snapshot.restorer.restore();
    } catch (e) {
      if (e instanceof InvalidSnapshotError) {
        throw new FixtureSnapshotError(e);
      }

      throw e;
    }

    return snapshot.data;
  } else {
    const data = await fixture();
    const restorer = await takeSnapshot();

    snapshots.push({
      restorer,
      fixture,
      data,
    });

    return data;
  }
}
