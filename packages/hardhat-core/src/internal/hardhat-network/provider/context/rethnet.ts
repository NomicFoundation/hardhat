import { Common } from "@nomicfoundation/ethereumjs-common";
import { toBuffer } from "@nomicfoundation/ethereumjs-util";
import {
  BlockMiner,
  Blockchain,
  Rethnet,
  RethnetContext,
  StateManager,
} from "rethnet-evm";
import { BlockchainAdapter } from "../blockchain";
import { RethnetBlockchain } from "../blockchain/rethnet";
import { EthContextAdapter } from "../context";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { BlockBuilderAdapter, BuildBlockOpts } from "../vm/block-builder";
import { VMAdapter } from "../vm/vm-adapter";
import { RethnetMiner } from "../miner/rethnet";
import { RethnetAdapter } from "../vm/rethnet";
import { NodeConfig } from "../node-types";
import { ethereumsjsHardforkToRethnetSpecId } from "../utils/convertToRethnet";
import { getHardforkName } from "../../../util/hardforks";
import { RethnetStateManager } from "../RethnetState";
import { RethnetMemPool } from "../mem-pool/rethnet";
import { makeCommon } from "../utils/makeCommon";

// Only one is allowed to exist
export const globalRethnetContext = new RethnetContext();

export class RethnetEthContext implements EthContextAdapter {
  private _blockchain: RethnetBlockchain;
  private _mempool: RethnetMemPool;
  private _miner: RethnetMiner;
  private _state: RethnetStateManager;
  private _vm: RethnetAdapter;

  constructor(config: NodeConfig) {
    const common = makeCommon(config);
    const hardforkName = getHardforkName(config.hardfork);

    this._blockchain = new RethnetBlockchain(new Blockchain(), common);
    this._state = new RethnetStateManager(
      new StateManager(globalRethnetContext)
    );

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true ? 2n ** 64n - 1n : undefined;

    const rethnet = new Rethnet(
      this._blockchain.asInner(),
      this._state.asInner(),
      {
        chainId: BigInt(config.chainId),
        specId: ethereumsjsHardforkToRethnetSpecId(hardforkName),
        limitContractCodeSize,
        disableBlockGasLimit: true,
        disableEip3607: true,
      }
    );

    const _selectHardfork: (blockNumber: bigint) => string;

    this._vm = new RethnetAdapter(
      this._blockchain.asInner(),
      this._state,
      rethnet,
      _selectHardfork,
      common
    );

    this._mempool = new RethnetMemPool(
      BigInt(config.blockGasLimit),
      this._state.asInner(),
      hardforkName
    );

    this._miner = new RethnetMiner(
      new BlockMiner(
        this._blockchain.asInner(),
        this._state.asInner(),
        this._mempool.asInner(),
        // TODO: Should this be the same config? Split config?
        rethnet.config(),
        BigInt(config.blockGasLimit),
        toBuffer(config.coinbase)
      ),
      common
    );
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
    return this._mempool;
  }

  public vm(): VMAdapter {
    return this._vm;
  }
}
