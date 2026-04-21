import type {
  EdrNetworkAccountsConfig,
  EdrNetworkForkingConfig,
} from "../../../../types/config.js";
import type { ChainType } from "../../../../types/network.js";
import type * as MicroEthSignerAddressT from "micro-eth-signer/address";

import {
  l1GenesisState,
  l1HardforkFromString,
  opGenesisState,
  opHardforkFromString,
  type AccountOverride,
} from "@nomicfoundation/edr";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";
import { hexToBytes } from "ethereum-cryptography/utils";

import { OPTIMISM_CHAIN_TYPE } from "../../../constants.js";

import { hardhatAccountsToEdrOwnedAccounts } from "./utils/convert-to-edr.js";

// micro-eth-signer is known to be slow to load, so we lazy load it
let microEthSignerAddress: typeof MicroEthSignerAddressT | undefined;

const noForkingConfigCacheMarkerObject = {};

/**
 * We cache the genesis state and owned accounts because computing them can be
 * expensive, especially when run multiple times for the same configuration
 * (e.g. when creating many EDR connections to the same network config).
 *
 * We use mostly references as cache keys, which means that we can miss some
 * cache hits if an equivalent config is used with a different reference, but
 * in practice this should rarely happen, except when using network config
 * overrides that generate the same config. These cases should be the minority
 * within a test suite.
 *
 * Note: the main reason that we don't use the entire NetworkConfig as cache
 * key is that EDR initialization path recreates the NetworkConfig object to
 * override some properties like `allowUnlimitedContractSize`, leading to a
 * different NetworkConfig reference, despite keeping the references of most
 * of its properties (including the accounts and forking config) the same.
 */
const genesisStateAndAccountsCache: WeakMap<
  EdrNetworkAccountsConfig,
  WeakMap<
    EdrNetworkForkingConfig | typeof noForkingConfigCacheMarkerObject,
    Map<
      ChainType,
      Map<
        string,
        {
          genesisState: Map<Uint8Array, AccountOverride>;
          ownedAccounts: Array<{ secretKey: string; balance: bigint }>;
        }
      >
    >
  >
> = new WeakMap();

const genesisStateAndAccountsCacheMutex = new AsyncMutex();

export async function getGenesisStateAndOwnedAccounts(
  accountsConfig: EdrNetworkAccountsConfig,
  forkingConfig: EdrNetworkForkingConfig | undefined,
  chainType: ChainType,
  specId: string,
): Promise<{
  genesisState: Map<Uint8Array, AccountOverride>;
  ownedAccounts: Array<{ secretKey: string; balance: bigint }>;
}> {
  const cached = genesisStateAndAccountsCache
    .get(accountsConfig)
    ?.get(forkingConfig ?? noForkingConfigCacheMarkerObject)
    ?.get(chainType)
    ?.get(specId);

  if (cached !== undefined) {
    return cached;
  }

  return await genesisStateAndAccountsCacheMutex.exclusiveRun(async () => {
    // We need to check again inside the mutex callback in case another async
    // operation initialized it while we were waiting to acquire the mutex
    const cachedAfterWaiting = genesisStateAndAccountsCache
      .get(accountsConfig)
      ?.get(forkingConfig ?? noForkingConfigCacheMarkerObject)
      ?.get(chainType)
      ?.get(specId);

    if (cachedAfterWaiting !== undefined) {
      return cachedAfterWaiting;
    }

    const result = await createGenesisStateAndOwnedAccounts(
      accountsConfig,
      forkingConfig,
      chainType,
      specId,
    );

    let secondLevelCacheMap = genesisStateAndAccountsCache.get(accountsConfig);
    if (secondLevelCacheMap === undefined) {
      secondLevelCacheMap = new WeakMap();
      genesisStateAndAccountsCache.set(accountsConfig, secondLevelCacheMap);
    }

    const forkingConfigCacheKey =
      forkingConfig ?? noForkingConfigCacheMarkerObject;
    let thirdLevelCacheMap = secondLevelCacheMap.get(forkingConfigCacheKey);
    if (thirdLevelCacheMap === undefined) {
      thirdLevelCacheMap = new Map();
      secondLevelCacheMap.set(forkingConfigCacheKey, thirdLevelCacheMap);
    }

    let fourthLevelCacheMap = thirdLevelCacheMap.get(chainType);
    if (fourthLevelCacheMap === undefined) {
      fourthLevelCacheMap = new Map();
      thirdLevelCacheMap.set(chainType, fourthLevelCacheMap);
    }

    fourthLevelCacheMap.set(specId, result);

    return result;
  });
}

async function createGenesisStateAndOwnedAccounts(
  accountsConfig: EdrNetworkAccountsConfig,
  forkingConfig: EdrNetworkForkingConfig | undefined,
  chainType: ChainType,
  specId: string,
): Promise<{
  genesisState: Map<Uint8Array, AccountOverride>;
  ownedAccounts: Array<{ secretKey: string; balance: bigint }>;
}> {
  if (microEthSignerAddress === undefined) {
    microEthSignerAddress = await import("micro-eth-signer/address");
  }

  const { addr } = microEthSignerAddress;

  const ownedAccounts = await hardhatAccountsToEdrOwnedAccounts(accountsConfig);

  const genesisState: Map<Uint8Array, AccountOverride> = new Map(
    ownedAccounts.map(({ secretKey, balance }) => {
      const address = hexToBytes(addr.fromPrivateKey(secretKey));
      const accountOverride: AccountOverride = {
        address,
        balance: BigInt(balance),
        code: new Uint8Array(), // Empty account code, removing potential delegation code when forking
      };

      return [address, accountOverride];
    }),
  );

  const chainGenesisState =
    forkingConfig !== undefined
      ? [] // TODO: Add support for overriding remote fork state when the local fork is different
      : chainType === OPTIMISM_CHAIN_TYPE
        ? opGenesisState(opHardforkFromString(specId))
        : l1GenesisState(l1HardforkFromString(specId));

  for (const account of chainGenesisState) {
    const existingOverride = genesisState.get(account.address);
    if (existingOverride !== undefined) {
      // Favor the genesis state specified by the user
      account.balance = account.balance ?? existingOverride.balance;
      account.nonce = account.nonce ?? existingOverride.nonce;
      account.code = account.code ?? existingOverride.code;
      account.storage = account.storage ?? existingOverride.storage;
    } else {
      genesisState.set(account.address, account);
    }
  }

  return { genesisState, ownedAccounts };
}
