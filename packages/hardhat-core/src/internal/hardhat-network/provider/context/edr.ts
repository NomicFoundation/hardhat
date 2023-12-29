import {
  KECCAK256_RLP,
  privateToAddress,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { Account, Blockchain, EdrContext, SpecId } from "@ignored/edr";
import { BlockchainAdapter } from "../blockchain";
import { EdrBlockchain } from "../blockchain/edr";
import { EthContextAdapter } from "../context";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { VMAdapter } from "../vm/vm-adapter";
import { EdrMiner } from "../miner/edr";
import { EdrAdapter } from "../vm/edr";
import { NodeConfig, isForkedNodeConfig } from "../node-types";
import {
  ethereumjsMempoolOrderToEdrMineOrdering,
  ethereumsjsHardforkToEdrSpecId,
} from "../utils/convertToEdr";
import { getHardforkName } from "../../../util/hardforks";
import { EdrStateManager } from "../EdrState";
import { EdrMemPool } from "../mem-pool/edr";
import { makeCommon } from "../utils/makeCommon";
import { HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS } from "../../../core/config/default-config";
import { RandomBufferGenerator } from "../utils/random";
import { dateToTimestampSeconds } from "../../../util/date";
import { EdrIrregularState } from "../EdrIrregularState";

export const UNLIMITED_CONTRACT_SIZE_VALUE = 2n ** 64n - 1n;

let _globalEdrContext: EdrContext | undefined;

// Lazy initialize the global EDR context.
export function getGlobalEdrContext(): EdrContext {
  if (_globalEdrContext === undefined) {
    // Only one is allowed to exist
    _globalEdrContext = new EdrContext();
  }

  return _globalEdrContext;
}

export class EdrEthContext implements EthContextAdapter {
  constructor(
    private readonly _blockchain: EdrBlockchain,
    private readonly _memPool: EdrMemPool,
    private readonly _miner: EdrMiner,
    private readonly _vm: EdrAdapter
  ) {}

  public static async create(config: NodeConfig): Promise<EdrEthContext> {
    const common = makeCommon(config);

    const prevRandaoGenerator =
      RandomBufferGenerator.create("randomMixHashSeed");

    let blockchain: EdrBlockchain;
    let state: EdrStateManager;

    const specId = config.enableTransientStorage
      ? SpecId.Cancun
      : ethereumsjsHardforkToEdrSpecId(getHardforkName(config.hardfork));

    const irregularState = new EdrIrregularState();

    if (isForkedNodeConfig(config)) {
      const chainIdToHardforkActivations: Array<
        [bigint, Array<[bigint, SpecId]>]
      > = Array.from(config.chains).map(([chainId, chainConfig]) => {
        const hardforkActivations: Array<[bigint, SpecId]> = Array.from(
          chainConfig.hardforkHistory
        ).map(([hardfork, blockNumber]) => {
          return [
            BigInt(blockNumber),
            ethereumsjsHardforkToEdrSpecId(getHardforkName(hardfork)),
          ];
        });

        return [BigInt(chainId), hardforkActivations];
      });

      blockchain = new EdrBlockchain(
        await Blockchain.fork(
          getGlobalEdrContext(),
          specId,
          chainIdToHardforkActivations,
          config.forkConfig.jsonRpcUrl,
          config.forkConfig.blockNumber !== undefined
            ? BigInt(config.forkConfig.blockNumber)
            : undefined,
          config.forkCachePath
        ),
        irregularState,
        common
      );

      const latestBlockNumber = await blockchain.getLatestBlockNumber();
      const forkState = await blockchain.getStateAtBlockNumber(
        latestBlockNumber
      );

      if (config.genesisAccounts.length > 0) {
        // Override the genesis accounts
        const genesisAccounts: Array<[Buffer, Account]> = await Promise.all(
          config.genesisAccounts.map(async (genesisAccount) => {
            const privateKey = toBuffer(genesisAccount.privateKey);
            const address = privateToAddress(privateKey);

            const originalAccount = await forkState.modifyAccount(
              address,
              async (balance, nonce, code) => {
                return {
                  balance: BigInt(genesisAccount.balance),
                  nonce,
                  code,
                };
              }
            );
            const modifiedAccount =
              originalAccount !== null
                ? {
                    ...originalAccount,
                    balance: BigInt(genesisAccount.balance),
                  }
                : {
                    balance: BigInt(genesisAccount.balance),
                    nonce: 0n,
                  };

            return [address, modifiedAccount];
          })
        );

        // Generate a new state root
        const stateRoot = await forkState.getStateRoot();

        // Store the overrides in the irregular state
        await irregularState
          .asInner()
          .applyAccountChanges(latestBlockNumber, stateRoot, genesisAccounts);
      }

      state = new EdrStateManager(forkState);

      config.forkConfig.blockNumber = Number(latestBlockNumber);
    } else {
      const initialBaseFeePerGas =
        specId >= SpecId.London
          ? config.initialBaseFeePerGas !== undefined
            ? BigInt(config.initialBaseFeePerGas)
            : BigInt(HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS)
          : undefined;

      const initialBlockTimestamp =
        config.initialDate !== undefined
          ? BigInt(dateToTimestampSeconds(config.initialDate))
          : undefined;

      const initialMixHash =
        specId >= SpecId.Merge ? prevRandaoGenerator.next() : undefined;

      const initialBlobGas =
        specId >= SpecId.Cancun
          ? {
              gasUsed: 0n,
              excessGas: 0n,
            }
          : undefined;

      const initialParentBeaconRoot =
        specId >= SpecId.Cancun ? KECCAK256_RLP : undefined;

      blockchain = new EdrBlockchain(
        new Blockchain(
          common.chainId(),
          specId,
          BigInt(config.blockGasLimit),
          config.genesisAccounts.map((account) => {
            return {
              secretKey: account.privateKey,
              balance: BigInt(account.balance),
            };
          }),
          initialBlockTimestamp,
          initialMixHash,
          initialBaseFeePerGas,
          initialBlobGas,
          initialParentBeaconRoot
        ),
        irregularState,
        common
      );

      state = new EdrStateManager(await blockchain.getStateAtBlockNumber(0n));
    }

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true
        ? UNLIMITED_CONTRACT_SIZE_VALUE
        : undefined;

    const vm = new EdrAdapter(
      blockchain.asInner(),
      irregularState,
      state,
      common,
      limitContractCodeSize,
      config.enableTransientStorage
    );

    const memPool = new EdrMemPool(BigInt(config.blockGasLimit), state, specId);

    const miner = new EdrMiner(
      blockchain,
      state,
      memPool,
      common,
      limitContractCodeSize,
      ethereumjsMempoolOrderToEdrMineOrdering(config.mempoolOrder),
      prevRandaoGenerator
    );

    return new EdrEthContext(blockchain, memPool, miner, vm);
  }

  public blockchain(): BlockchainAdapter {
    return this._blockchain;
  }

  public blockMiner(): BlockMinerAdapter {
    return this._miner;
  }

  public memPool(): MemPoolAdapter {
    return this._memPool;
  }

  public vm(): VMAdapter {
    return this._vm;
  }
}
