import {
  BufferLike,
  PrefixedHexString,
  Transaction,
  TransactionOptions,
  TxData,
} from "ethereumjs-tx";
import { BN, bufferToInt, ecrecover } from "ethereumjs-util";

import { InternalError } from "../errors";

// tslint:disable only-hardhat-error

/**
 * Custom Transaction class to avoid EIP155 errors when hardhat is forked
 */
export class ForkTransaction extends Transaction {
  private readonly _chainId: number;

  constructor(
    chainId: number,
    data: Buffer | PrefixedHexString | BufferLike[] | TxData = {},
    opts: TransactionOptions = {}
  ) {
    super(data, opts);

    this._chainId = chainId;

    const msgHash = this.hash(false);
    const v = bufferToInt(this.v);

    const senderPubKey = ecrecover(
      msgHash,
      v,
      this.r,
      this.s,
      (this as any)._implementsEIP155() ? chainId : undefined
    );

    (this as any)._senderPubKey = senderPubKey;
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
  const v = bufferToInt(this.v);

  return v === chainId * 2 + 35 || v === chainId * 2 + 36;
};
