import type { SnapshotRestorer } from "./helpers/takeSnapshot";

type Fixture<T> = () => Promise<T>;

interface Snapshot<T> {
  restorer: SnapshotRestorer;
  fixture: Fixture<T>;
  data: T;
}

const snapshots: Array<Snapshot<any>> = [];

export async function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
  const snapshot = snapshots.find((s) => s.fixture === fixture);

  const { takeSnapshot } = await import("./helpers/takeSnapshot");

  if (snapshot !== undefined) {
    await snapshot.restorer.restore();

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
