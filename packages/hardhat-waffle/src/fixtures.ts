import { MockProvider } from "ethereum-waffle";
import { providers, Signer } from "ethers";

// This file only exists to workaround this: https://github.com/EthWorks/Waffle/issues/281

type Fixture<T> = (
  signers: Signer[],
  provider: providers.JsonRpcProvider
) => Promise<T>;
interface Snapshot<T> {
  fixture: Fixture<T>;
  data: T;
  id: string;
  provider: providers.JsonRpcProvider;
  signers: Signer[];
}

function createFixtureLoader(
  signers: Signer[],
  provider: providers.JsonRpcProvider
) {
  const snapshots: Array<Snapshot<any>> = [];

  return async function load<T>(fixture: Fixture<T>): Promise<T> {
    const snapshot = snapshots.find((p) => p.fixture === fixture);
    if (snapshot !== undefined) {
      await snapshot.provider.send("evm_revert", [snapshot.id]);
      snapshot.id = await snapshot.provider.send("evm_snapshot", []);
      return snapshot.data;
    }
    {
      const data = await fixture(signers, provider);
      const id = await provider.send("evm_snapshot", []);

      snapshots.push({ fixture, data, id, provider, signers });
      return data;
    }
  };
}

export function hardhatCreateFixtureLoader(
  hardhatWaffleProvider: MockProvider,
  overrideSigners: Signer[],
  overrideProvider?: providers.JsonRpcProvider
) {
  return createFixtureLoader(
    overrideSigners,
    overrideProvider ?? hardhatWaffleProvider
  );
}
