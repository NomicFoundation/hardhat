import { Blockchain, RethnetContext, SpecId } from "@ignored/edr";
import { AsyncEventEmitter } from "@nomicfoundation/ethereumjs-util";

import { BlockchainAdapter } from "../blockchain";
import { RethnetBlockchain } from "../blockchain/rethnet";
import { EthContextAdapter } from "../context";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { VMAdapter } from "../vm/vm-adapter";
import { RethnetMiner } from "../miner/rethnet";
import { RethnetAdapter, VMStub } from "../vm/rethnet";
import { NodeConfig, isForkedNodeConfig } from "../node-types";
import {
  ethereumjsHeaderDataToRethnetBlockOptions,
  ethereumjsMempoolOrderToRethnetMineOrdering,
  ethereumsjsHardforkToRethnetSpecId,
} from "../utils/convertToRethnet";
import {
  HardforkName,
  getHardforkName,
  hardforkGte,
} from "../../../util/hardforks";
import { RethnetStateManager } from "../RethnetState";
import { RethnetMemPool } from "../mem-pool/rethnet";
import { makeCommon } from "../utils/makeCommon";
import { HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS } from "../../../core/config/default-config";
import { makeGenesisBlock } from "../utils/putGenesisBlock";
import { RandomBufferGenerator } from "../utils/random";

export const UNLIMITED_CONTRACT_SIZE_VALUE = 2n ** 64n - 1n;

// Only one is allowed to exist
export const globalRethnetContext = new RethnetContext();

export class RethnetEthContext implements EthContextAdapter {
  constructor(
    private readonly _blockchain: RethnetBlockchain,
    private readonly _memPool: RethnetMemPool,
    private readonly _miner: RethnetMiner,
    private readonly _vm: RethnetAdapter
  ) {}

  public static async create(config: NodeConfig): Promise<RethnetEthContext> {
    const common = makeCommon(config);
    const hardforkName = getHardforkName(config.hardfork);

    const prevRandaoGenerator =
      RandomBufferGenerator.create("randomMixHashSeed");

    let blockchain: RethnetBlockchain;
    let state: RethnetStateManager;

    if (isForkedNodeConfig(config)) {
      const chainIdToHardforkActivations: Array<
        [bigint, Array<[bigint, SpecId]>]
      > = Array.from(config.chains).map(([chainId, chainConfig]) => {
        const hardforkActivations: Array<[bigint, SpecId]> = Array.from(
          chainConfig.hardforkHistory
        ).map(([hardfork, blockNumber]) => {
          const specId = ethereumsjsHardforkToRethnetSpecId(
            getHardforkName(hardfork)
          );
          return [BigInt(blockNumber), specId];
        });

        return [BigInt(chainId), hardforkActivations];
      });

      blockchain = new RethnetBlockchain(
        await Blockchain.fork(
          globalRethnetContext,
          ethereumsjsHardforkToRethnetSpecId(hardforkName),
          config.forkConfig.jsonRpcUrl,
          config.forkConfig.blockNumber !== undefined
            ? BigInt(config.forkConfig.blockNumber)
            : undefined,
          config.forkCachePath,
          config.genesisAccounts.map((account) => {
            return {
              privateKey: account.privateKey,
              balance: BigInt(account.balance),
            };
          }),
          chainIdToHardforkActivations
        ),
        common
      );

      const latestBlockNumber = await blockchain.getLatestBlockNumber();
      state = new RethnetStateManager(
        await blockchain.getStateAtBlockNumber(latestBlockNumber)
      );

      config.forkConfig.blockNumber = Number(latestBlockNumber);
    } else {
      state = RethnetStateManager.withGenesisAccounts(
        globalRethnetContext,
        config.genesisAccounts
      );

      const initialBaseFeePerGas =
        config.initialBaseFeePerGas !== undefined
          ? BigInt(config.initialBaseFeePerGas)
          : BigInt(HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS);

      const genesisBlockBaseFeePerGas = hardforkGte(
        hardforkName,
        HardforkName.LONDON
      )
        ? initialBaseFeePerGas
        : undefined;

      const genesisBlockHeader = makeGenesisBlock(
        config,
        await state.getStateRoot(),
        hardforkName,
        prevRandaoGenerator,
        genesisBlockBaseFeePerGas
      );

      blockchain = new RethnetBlockchain(
        Blockchain.withGenesisBlock(
          common.chainId(),
          ethereumsjsHardforkToRethnetSpecId(hardforkName),
          ethereumjsHeaderDataToRethnetBlockOptions(genesisBlockHeader),
          config.genesisAccounts.map((account) => {
            return {
              privateKey: account.privateKey,
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

    const vmStub: VMStub = {
      evm: {
        events: new AsyncEventEmitter(),
      },
    };

    const vm = new RethnetAdapter(
      blockchain.asInner(),
      state,
      common,
      limitContractCodeSize,
      limitInitcodeSize,
      vmStub
    );

    const memPool = new RethnetMemPool(
      BigInt(config.blockGasLimit),
      state,
      hardforkName
    );

    const miner = new RethnetMiner(
      blockchain,
      state,
      memPool,
      common,
      limitContractCodeSize,
      ethereumjsMempoolOrderToRethnetMineOrdering(config.mempoolOrder),
      prevRandaoGenerator,
      vmStub
    );

    return new RethnetEthContext(blockchain, memPool, miner, vm);
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
