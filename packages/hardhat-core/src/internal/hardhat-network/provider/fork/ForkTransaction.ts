import {
  BufferLike,
  PrefixedHexString,
  Transaction,
  TransactionOptions,
  TxData,
} from "ethereumjs-tx";
import { BN, bufferToInt } from "ethereumjs-util";

import { InternalError } from "../errors";

// tslint:disable only-hardhat-error

/**
 * Custom Transaction class to avoid EIP155 errors when hardhat is forked
 */
export class ForkTransaction extends Transaction {
  private readonly _chainId: number;

  constructor(
    chainId: number,
    senderPubKey: Buffer,
    data: Buffer | PrefixedHexString | BufferLike[] | TxData = {},
    opts: TransactionOptions = {}
  ) {
    super(data, opts);

    (this as any)._senderPubKey = senderPubKey;
    this._chainId = chainId;
  }

  public verifySignature(): boolean {
    return true;
  }

  public getChainId(): number {
    return this._chainId;
  }

  public sign() {
    throw new InternalError("`sign` is not implemented in ForkTransaction");
  }
  public getDataFee(): BN {
    throw new InternalError(
      "`getDataFee` is not implemented in ForkTransaction"
    );
  }
  public getBaseFee(): BN {
    throw new InternalError(
      "`getBaseFee` is not implemented in ForkTransaction"
    );
  }
  public getUpfrontCost(): BN {
    throw new InternalError(
      "`getUpfrontCost` is not implemented in ForkTransaction"
    );
  }

  public validate(_?: false): boolean;
  public validate(_: true): string;
  public validate(_: boolean = false): boolean | string {
    throw new InternalError("`validate` is not implemented in ForkTransaction");
  }

  public toCreationAddress(): boolean {
    throw new InternalError(
      "`toCreationAddress` is not implemented in ForkTransaction"
    );
  }
}

// override private methods
const ForkTransactionPrototype: any = ForkTransaction.prototype;

// make _validateV a noop
ForkTransactionPrototype._validateV = function () {};

ForkTransactionPrototype._implementsEIP155 = function (): boolean {
  const chainId = this.getChainId();
  const v = bufferToInt(this._v);

  return this._v === chainId * 2 + 35 || v === chainId * 2 + 36;
};
