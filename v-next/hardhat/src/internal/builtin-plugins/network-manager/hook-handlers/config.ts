import type {
  ConfigurationVariable,
  EdrNetworkConfig,
  EdrNetworkUserConfig,
  GasConfig,
  GasUserConfig,
  HardhatConfig,
  HardhatUserConfig,
  HDAccountsUserConfig,
  HttpNetworkAccountsConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkUserConfig,
  ResolvedConfigurationVariable,
} from "../../../../types/config.js";
import type { ConfigHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { normalizeHexString } from "@ignored/hardhat-vnext-utils/hex";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";

import { validateUserConfig } from "../type-validation.js";

export default async (): Promise<Partial<ConfigHooks>> => ({
  extendUserConfig,
  validateUserConfig,
  resolveUserConfig,
});

export async function extendUserConfig(
  config: HardhatUserConfig,
  next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
): Promise<HardhatUserConfig> {
  const extendedConfig = await next(config);

  const networks: Record<string, NetworkUserConfig> =
    extendedConfig.networks ?? {};

  // TODO: we should address this casting when edr is implemented
  const localhostConfig: Omit<HttpNetworkUserConfig, "url"> = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- This is always http
    ...(networks.localhost as HttpNetworkUserConfig),
  };

  const hardhatConfig: Partial<EdrNetworkUserConfig> = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- This is always edr
    ...(networks.hardhat as EdrNetworkUserConfig),
  };

  return {
    ...extendedConfig,
    networks: {
      ...networks,
      localhost: {
        url: "http://localhost:8545",
        ...localhostConfig,
        type: "http",
      },
      hardhat: {
        chainId: 31337,
        gas: "auto",
        gasMultiplier: 1,
        gasPrice: "auto",
        ...hardhatConfig,
        type: "edr",
      },
    },
  };
}

export async function resolveUserConfig(
  userConfig: HardhatUserConfig,
  resolveConfigurationVariable: (
    variableOrString: ConfigurationVariable | string,
  ) => ResolvedConfigurationVariable,
  next: (
    nextUserConfig: HardhatUserConfig,
    nextResolveConfigurationVariable: (
      variableOrString: ConfigurationVariable | string,
    ) => ResolvedConfigurationVariable,
  ) => Promise<HardhatConfig>,
): Promise<HardhatConfig> {
  const DEFAULT_EDR_ACCOUNTS = [
    {
      privateKey:
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
      balance: "10000000000000000000000",
    },
    {
      privateKey:
        "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
      balance: "10000000000000000000000",
    },
  ];

  const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

  const networks: Record<string, NetworkUserConfig> = userConfig.networks ?? {};

  const resolvedNetworks: Record<string, NetworkConfig> = {};

  for (const [networkName, networkConfig] of Object.entries(networks)) {
    if (networkConfig.type !== "http" && networkConfig.type !== "edr") {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.INVALID_NETWORK_TYPE, {
        networkName,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we want to show the type
        networkType: (networkConfig as any).type,
      });
    }

    if (networkConfig.type === "http") {
      const resolvedNetworkConfig: HttpNetworkConfig = {
        type: "http",
        chainId: networkConfig.chainId,
        chainType: networkConfig.chainType,
        from: networkConfig.from,
        gas: resolveGasConfig(networkConfig.gas),
        gasMultiplier: networkConfig.gasMultiplier ?? 1,
        gasPrice: resolveGasConfig(networkConfig.gasPrice),
        accounts: resolveAccounts(
          networkConfig.accounts,
          resolveConfigurationVariable,
        ),
        url: networkConfig.url,
        timeout: networkConfig.timeout ?? 20_000,
        httpHeaders: networkConfig.httpHeaders ?? {},
      };

      resolvedNetworks[networkName] = resolvedNetworkConfig;
    }

    if (networkConfig.type === "edr") {
      const resolvedNetworkConfig: EdrNetworkConfig = {
        type: "edr",
        chainId: networkConfig.chainId ?? 31337,
        chainType: networkConfig.chainType,
        from: networkConfig.from,
        gas: resolveGasConfig(networkConfig.gas),
        gasMultiplier: networkConfig.gasMultiplier ?? 1,
        gasPrice: resolveGasConfig(networkConfig.gasPrice),
        // TODO: This isn't how it's called in v2
        forkConfig: networkConfig.forkConfig,
        forkCachePath:
          networkConfig.forkCachePath !== undefined
            ? resolveFromRoot(
                resolvedConfig.paths.root,
                networkConfig.forkCachePath,
              )
            : path.join(resolvedConfig.paths.cache, "edr-cache"),
        hardfork: networkConfig.hardfork ?? "cancun",
        networkId: networkConfig.networkId ?? networkConfig.chainId ?? 31337,
        blockGasLimit: networkConfig.blockGasLimit ?? 12_500_000,
        minGasPrice: BigInt(networkConfig.minGasPrice ?? 0),
        automine: networkConfig.automine ?? true,
        intervalMining: networkConfig.intervalMining ?? 0,
        mempoolOrder: networkConfig.mempoolOrder ?? "fifo",
        chains: networkConfig.chains ?? new Map(),
        genesisAccounts: networkConfig.genesisAccounts ?? [
          ...DEFAULT_EDR_ACCOUNTS,
        ],
        allowUnlimitedContractSize:
          networkConfig.allowUnlimitedContractSize ?? false,
        throwOnTransactionFailures:
          networkConfig.throwOnTransactionFailures ?? true,
        throwOnCallFailures: networkConfig.throwOnCallFailures ?? true,
        allowBlocksWithSameTimestamp:
          networkConfig.allowBlocksWithSameTimestamp ?? false,
        enableTransientStorage: networkConfig.enableTransientStorage ?? false,
        enableRip7212: networkConfig.enableRip7212 ?? false,
      };

      resolvedNetworks[networkName] = resolvedNetworkConfig;
    }
  }

  return {
    ...resolvedConfig,
    defaultChainType: resolvedConfig.defaultChainType ?? "generic",
    defaultNetwork: resolvedConfig.defaultNetwork ?? "hardhat",
    networks: resolvedNetworks,
  };
}

function resolveGasConfig(value: GasUserConfig = "auto"): GasConfig {
  return value === "auto" ? value : BigInt(value);
}

function resolveAccounts(
  accounts: HttpNetworkAccountsUserConfig | undefined,
  resolveConfigurationVariable: (
    variableOrString: ConfigurationVariable | string,
  ) => ResolvedConfigurationVariable,
): HttpNetworkAccountsConfig {
  const defaultHdAccountsConfigParams = {
    initialIndex: 0,
    count: 20,
    path: "m/44'/60'/0'/0",
    passphrase: "",
  };

  return accounts === undefined
    ? "remote"
    : isHdAccountsConfig(accounts)
      ? {
          ...defaultHdAccountsConfigParams,
          ...accounts,
        }
      : Array.isArray(accounts)
        ? accounts.map((acc) => {
            if (typeof acc === "string") {
              acc = normalizeHexString(acc);
            }

            return resolveConfigurationVariable(acc);
          })
        : "remote";
}

function isHdAccountsConfig(
  accounts: HttpNetworkAccountsUserConfig,
): accounts is HDAccountsUserConfig {
  return typeof accounts === "object" && !Array.isArray(accounts);
}
