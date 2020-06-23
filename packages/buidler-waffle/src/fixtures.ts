import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import type { MockProvider } from "ethereum-waffle";
import { providers, Wallet } from "ethers";

// This file only exists to workaround this: https://github.com/EthWorks/Waffle/issues/281

type Fixture<T> = (wallets: Wallet[], provider: MockProvider) => Promise<T>;
interface Snapshot<T> {
  fixture: Fixture<T>;
  data: T;
  id: string;
  provider: providers.Web3Provider;
  wallets: Wallet[];
}

function createFixtureLoader(
  overrideWallets: Wallet[] | undefined,
  provider: MockProvider
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
      const wallets = overrideWallets ?? provider.getWallets();

      const data = await fixture(wallets, provider);
      const id = await provider.send("evm_snapshot", []);

      snapshots.push({ fixture, data, id, provider, wallets });
      return data;
    }
  };
}

export function buidlerCreateFixtureLoader(
  buidlerWaffleProvider: MockProvider,
  overrideWallets?: Wallet[],
  overrideProvider?: MockProvider
) {
  return createFixtureLoader(
    overrideWallets,
    overrideProvider ?? buidlerWaffleProvider
  );
}
