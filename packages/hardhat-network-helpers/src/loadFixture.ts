import type { SnapshotRestorer } from "./helpers/takeSnapshot";

import {
  FixtureAnonymousFunctionError,
  FixtureSnapshotError,
  InvalidSnapshotError,
} from "./errors";

type Fixture<T> = () => Promise<T>;

interface Snapshot<T> {
  restorer: SnapshotRestorer;
  fixture: Fixture<T>;
  data: T;
}

let inFixture: boolean = false;
const snapshots: Array<Snapshot<any>> = [];

/**
 * Useful in tests for setting up the desired state of the network.
 *
 * Executes the given function and takes a snapshot of the blockchain. Upon
 * subsequent calls to `loadFixture` with the same function, rather than
 * executing the function again, the blockchain will be restored to that
 * snapshot.
 *
 * - Correct usage: `loadFixture(deployTokens)`
 * - Incorrect usage: `loadFixture(async () => { ... })`
 */
export async function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
  if (inFixture) {
    return fixture();
  }

  inFixture = true;
  try {
    // Do not optimize this await away because otherwise the try-catch
    // won't work.
    return await loadFixtureHelper(fixture);
  } catch (e) {
    throw e;
  } finally {
    inFixture = false;
  }
}

async function loadFixtureHelper<T>(fixture: Fixture<T>): Promise<T> {
  if (fixture.name === "") {
    throw new FixtureAnonymousFunctionError();
  }

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
