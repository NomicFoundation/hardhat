import { Common } from "@nomicfoundation/ethereumjs-common";
import { toBuffer } from "@nomicfoundation/ethereumjs-util";
import { BlockMiner, Blockchain, Rethnet, RethnetContext } from "rethnet-evm";
import { BlockchainAdapter } from "../blockchain";
import { RethnetBlockchain } from "../blockchain/rethnet";
import { EthContextAdapter } from "../context";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { BlockBuilderAdapter, BuildBlockOpts } from "../vm/block-builder";
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
        globalRethnetContext.nextMixHash(),
        genesisBlockBaseFeePerGas
      );

      blockchain = new RethnetBlockchain(
        Blockchain.withGenesisBlock(
          common.chainId(),
          ethereumsjsHardforkToRethnetSpecId(hardforkName),
          ethereumjsHeaderDataToRethnetBlockOptions(genesisBlockHeader)
        ),
        common
      );
    }

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true ? 2n ** 64n - 1n : undefined;

    const rethnet = new Rethnet(blockchain.asInner(), state.asInner(), {
      chainId: BigInt(config.chainId),
      specId: ethereumsjsHardforkToRethnetSpecId(hardforkName),
      limitContractCodeSize,
      disableBlockGasLimit: true,
      disableEip3607: true,
    });

    const vm = new RethnetAdapter(blockchain.asInner(), state, rethnet, common);

    const memPool = new RethnetMemPool(
      BigInt(config.blockGasLimit),
      state.asInner(),
      hardforkName
    );

    const miner = new RethnetMiner(
      new BlockMiner(
        blockchain.asInner(),
        state.asInner(),
        memPool.asInner(),
        // TODO: Should this be the same config? Split config?
        rethnet.config(),
        BigInt(config.blockGasLimit),
        toBuffer(config.coinbase)
      ),
      common
    );

    return new RethnetEthContext(blockchain, memPool, miner, state, vm);
  }

  public blockchain(): BlockchainAdapter {
    return this._blockchain;
  }

  public async blockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter> {
    return this._vm.createBlockBuilder(common, opts);
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
