import { Address } from "@nomicfoundation/ethereumjs-util";
import { Blockchain, RethnetContext } from "rethnet-evm";
import { BlockchainAdapter } from "../blockchain";
import { RethnetBlockchain } from "../blockchain/rethnet";
import { EthContextAdapter } from "../context";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { VMAdapter } from "../vm/vm-adapter";
import { RethnetMiner } from "../miner/rethnet";
import { RethnetAdapter } from "../vm/rethnet";
import { NodeConfig, isForkedNodeConfig } from "../node-types";
import {
  ethereumjsHeaderDataToRethnetBlockOptions,
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

// Only one is allowed to exist
export const globalRethnetContext = new RethnetContext();

export class RethnetEthContext implements EthContextAdapter {
  constructor(
    private readonly _blockchain: RethnetBlockchain,
    private readonly _memPool: RethnetMemPool,
    private readonly _miner: RethnetMiner,
    private readonly _state: RethnetStateManager,
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
      blockchain = new RethnetBlockchain(
        await Blockchain.fork(
          globalRethnetContext,
          ethereumsjsHardforkToRethnetSpecId(hardforkName),
          config.forkConfig.jsonRpcUrl,
          config.forkConfig.blockNumber !== undefined
            ? BigInt(config.forkConfig.blockNumber)
            : undefined
        ),
        common
      );

      state = await RethnetStateManager.forkRemote(
        globalRethnetContext,
        config.forkConfig,
        config.genesisAccounts
      );
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

      const withdrawals = common.gteHardfork(HardforkName.SHANGHAI)
        ? []
        : undefined;

      blockchain = new RethnetBlockchain(
        Blockchain.withGenesisBlock(
          common.chainId(),
          ethereumsjsHardforkToRethnetSpecId(hardforkName),
          ethereumjsHeaderDataToRethnetBlockOptions(genesisBlockHeader),
          withdrawals
        ),
        common
      );
    }

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true ? 2n ** 64n - 1n : null;

    const vm = new RethnetAdapter(
      blockchain.asInner(),
      state,
      common,
      limitContractCodeSize
    );

    const memPool = new RethnetMemPool(
      BigInt(config.blockGasLimit),
      state.asInner(),
      hardforkName
    );

    const miner = new RethnetMiner(
      blockchain,
      state,
      memPool,
      common,
      limitContractCodeSize,
      Address.fromString(config.coinbase),
      prevRandaoGenerator
    );

    return new RethnetEthContext(blockchain, memPool, miner, state, vm);
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
