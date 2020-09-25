import { EIP1193Provider, RequestArguments } from "../../../types";

import { numberToRpcQuantity, rpcQuantityToNumber } from "./provider-utils";
import { ProviderWrapper } from "./wrapper";

const DEFAULT_GAS_MULTIPLIER = 1;
export const GANACHE_GAS_MULTIPLIER = 5;

export class FixedGasProvider extends ProviderWrapper {
  constructor(provider: EIP1193Provider, private readonly _gasLimit: number) {
    super(provider);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.method === "eth_sendTransaction") {
      const params = this._getParams(args);
      const tx = params[0];
      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = numberToRpcQuantity(this._gasLimit);
      }
    }

    return this._wrappedProvider.request(args);
  }
}

export class FixedGasPriceProvider extends ProviderWrapper {
  constructor(provider: EIP1193Provider, private readonly _gasPrice: number) {
    super(provider);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.method === "eth_sendTransaction") {
      const params = this._getParams(args);
      const tx = params[0];
      if (tx !== undefined && tx.gasPrice === undefined) {
        tx.gasPrice = numberToRpcQuantity(this._gasPrice);
      }
    }

    return this._wrappedProvider.request(args);
  }
}

abstract class MultipliedGasEstimationProvider extends ProviderWrapper {
  private _blockGasLimit: number | undefined;

  constructor(
    provider: EIP1193Provider,
    private readonly _gasMultiplier: number
  ) {
    super(provider);
  }

  protected async _getMultipliedGasEstimation(params: any[]): Promise<string> {
    try {
      const realEstimation = (await this._wrappedProvider.request({
        method: "eth_estimateGas",
        params,
      })) as string;

      if (this._gasMultiplier === 1) {
        return realEstimation;
      }

      const normalGas = rpcQuantityToNumber(realEstimation);
      const gasLimit = await this._getBlockGasLimit();

      const multiplied = Math.floor(normalGas * this._gasMultiplier);
      const gas = multiplied > gasLimit ? gasLimit - 1 : multiplied;

      return numberToRpcQuantity(gas);
    } catch (error) {
      if (error.message.toLowerCase().includes("execution error")) {
        const blockGasLimit = await this._getBlockGasLimit();
        return numberToRpcQuantity(blockGasLimit);
      }

      // tslint:disable-next-line only-hardhat-error
      throw error;
    }
  }

  private async _getBlockGasLimit(): Promise<number> {
    if (this._blockGasLimit === undefined) {
      const latestBlock = (await this._wrappedProvider.request({
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      })) as { gasLimit: string };

      const fetchedGasLimit = rpcQuantityToNumber(latestBlock.gasLimit);

      // We store a lower value in case the gas limit varies slightly
      this._blockGasLimit = Math.floor(fetchedGasLimit * 0.95);
    }

    return this._blockGasLimit;
  }
}

export class AutomaticGasProvider extends MultipliedGasEstimationProvider {
  constructor(
    provider: EIP1193Provider,
    gasMultiplier: number = DEFAULT_GAS_MULTIPLIER
  ) {
    super(provider, gasMultiplier);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.method === "eth_sendTransaction") {
      const params = this._getParams(args);
      const tx = params[0];
      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = await this._getMultipliedGasEstimation(params);
      }
    }

    return this._wrappedProvider.request(args);
  }
}

export class AutomaticGasPriceProvider extends ProviderWrapper {
  private _gasPrice: string | undefined;

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.method === "eth_sendTransaction") {
      const params = this._getParams(args);
      const tx = params[0];
      if (tx !== undefined && tx.gasPrice === undefined) {
        tx.gasPrice = await this._getGasPriceAsQuantity();
      }
    }

    return this._wrappedProvider.request(args);
  }

  private async _getGasPriceAsQuantity(): Promise<string> {
    if (this._gasPrice === undefined) {
      this._gasPrice = (await this._wrappedProvider.request({
        method: "eth_gasPrice",
      })) as string;
    }

    return this._gasPrice;
  }
}

/**
 * This provider multiplies whatever gas estimation Ganache gives by [[GANACHE_GAS_MULTIPLIER]]
 *
 * NOTE: This bug was present at least in Ganache 6.4.x.
 * One way to test if the bug is still present is to check if the estimation to
 * run a deployment transaction with this data is high enough:
 *  * 0x608060405234801561001057600080fd5b5060405161043e38038061043e8339810180604052602081101561003357600080fd5b81019080805164010000000081111561004b57600080fd5b8281019050602081018481111561006157600080fd5b815185600182028301116401000000008211171561007e57600080fd5b50509291905050506040516100929061010b565b604051809103906000f0801580156100ae573d6000803e3d6000fd5b506000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508060019080519060200190610104929190610117565b50506101bc565b6088806103b683390190565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015857805160ff1916838001178555610186565b82800160010185558215610186579182015b8281111561018557825182559160200191906001019061016a565b5b5090506101939190610197565b5090565b6101b991905b808211156101b557600081600090555060010161019d565b5090565b90565b6101eb806101cb6000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063f86cc00914610030575b600080fd5b61003861003a565b005b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166319ff1d216040518163ffffffff1660e01b8152600401600060405180830381600087803b1580156100a357600080fd5b505af11580156100b7573d6000803e3d6000fd5b505050506000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166319ff1d216040518163ffffffff1660e01b8152600401600060405180830381600087803b15801561012457600080fd5b505af1158015610138573d6000803e3d6000fd5b505050506000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166319ff1d216040518163ffffffff1660e01b8152600401600060405180830381600087803b1580156101a557600080fd5b505af11580156101b9573d6000803e3d6000fd5b5050505056fea165627a7a723058203691efa02f6279a7b7eea9265988d2deaf417c2590c3103779c96b68e78463b700296080604052348015600f57600080fd5b50606b80601d6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c806319ff1d2114602d575b600080fd5b60336035565b005b600560008190555056fea165627a7a72305820a00cf00e60c019ed83e0857faef9e9383880a5addd91429d30203771c82a4014002900000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000
 */
export class GanacheGasMultiplierProvider extends MultipliedGasEstimationProvider {
  private _cachedIsGanache: boolean | undefined;

  constructor(provider: EIP1193Provider) {
    super(provider, GANACHE_GAS_MULTIPLIER);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const isGanache = await this._isGanache();
    if (args.method === "eth_estimateGas" && isGanache) {
      const params = this._getParams(args);
      return this._getMultipliedGasEstimation(params);
    }

    return this._wrappedProvider.request(args);
  }

  private async _isGanache(): Promise<boolean> {
    if (this._cachedIsGanache === undefined) {
      const clientVersion = (await this._wrappedProvider.request({
        method: "web3_clientVersion",
      })) as string;

      this._cachedIsGanache = clientVersion.includes("TestRPC");
    }

    return this._cachedIsGanache;
  }
}
