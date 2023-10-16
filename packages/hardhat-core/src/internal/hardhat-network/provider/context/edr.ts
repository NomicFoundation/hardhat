import { Blockchain, EdrContext, SpecId } from "@ignored/edr";
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
  ethereumjsHeaderDataToEdrBlockOptions,
  ethereumjsMempoolOrderToEdrMineOrdering,
  ethereumsjsHardforkToEdrSpecId,
} from "../utils/convertToEdr";
import { HardforkName, getHardforkName } from "../../../util/hardforks";
import { EdrStateManager } from "../EdrState";
import { EdrMemPool } from "../mem-pool/edr";
import { makeCommon } from "../utils/makeCommon";
import { HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS } from "../../../core/config/default-config";
import { makeGenesisBlock } from "../utils/putGenesisBlock";
import { RandomBufferGenerator } from "../utils/random";

export const UNLIMITED_CONTRACT_SIZE_VALUE = 2n ** 64n - 1n;

// Only one is allowed to exist
export const globalEdrContext = new EdrContext();

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
          globalEdrContext,
          specId,
          config.forkConfig.jsonRpcUrl,
          config.forkConfig.blockNumber !== undefined
            ? BigInt(config.forkConfig.blockNumber)
            : undefined,
          config.forkCachePath,
          config.genesisAccounts.map((account) => {
            return {
              secretKey: account.privateKey,
              balance: BigInt(account.balance),
            };
          }),
          chainIdToHardforkActivations
        ),
        common
      );

      const latestBlockNumber = await blockchain.getLatestBlockNumber();
      state = new EdrStateManager(
        await blockchain.getStateAtBlockNumber(latestBlockNumber)
      );

      config.forkConfig.blockNumber = Number(latestBlockNumber);
    } else {
      state = EdrStateManager.withGenesisAccounts(
        globalEdrContext,
        config.genesisAccounts
      );

      const initialBaseFeePerGas =
        config.initialBaseFeePerGas !== undefined
          ? BigInt(config.initialBaseFeePerGas)
          : BigInt(HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS);

      const genesisBlockBaseFeePerGas =
        specId >= SpecId.London ? initialBaseFeePerGas : undefined;

      const genesisBlockHeader = makeGenesisBlock(
        config,
        await state.getStateRoot(),
        // HardforkName.CANCUN is not supported yet, so use SHANGHAI instead
        config.enableTransientStorage
          ? HardforkName.SHANGHAI
          : getHardforkName(config.hardfork),
        prevRandaoGenerator,
        genesisBlockBaseFeePerGas
      );

      blockchain = new EdrBlockchain(
        Blockchain.withGenesisBlock(
          common.chainId(),
          specId,
          ethereumjsHeaderDataToEdrBlockOptions(genesisBlockHeader),
          config.genesisAccounts.map((account) => {
            return {
              secretKey: account.privateKey,
              balance: BigInt(account.balance),
            };
          })
        ),
        common
      );
    }

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true
        ? UNLIMITED_CONTRACT_SIZE_VALUE
        : undefined;
    const limitInitcodeSize =
      config.allowUnlimitedContractSize === true
        ? UNLIMITED_CONTRACT_SIZE_VALUE
        : undefined;

    const vm = new EdrAdapter(
      blockchain.asInner(),
      state,
      common,
      limitContractCodeSize,
      limitInitcodeSize,
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
