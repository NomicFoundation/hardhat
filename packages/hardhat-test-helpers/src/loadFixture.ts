type Fixture<T> = () => Promise<T>;

interface Snapshot<T> {
  id: string;
  fixture: Fixture<T>;
  data: T;
}

const snapshots: Array<Snapshot<any>> = [];

export async function loadFixture<T>(fixture: Fixture<T>): Promise<T> {
  const snapshot = snapshots.find((s) => s.fixture === fixture);

  const hre = require("hardhat");
  const provider = hre.network.provider;

  if (snapshot !== undefined) {
    await provider.request({
      method: "evm_revert",
      params: [snapshot.id],
    });
    snapshot.id = (await provider.request({
      method: "evm_snapshot",
      params: [],
    })) as string;

    return snapshot.data;
  } else {
    const data = await fixture();
    const id = (await provider.request({
      method: "evm_snapshot",
      params: [],
    })) as string;

    snapshots.push({
      id,
      fixture,
      data,
    });

    return data;
  }
}
