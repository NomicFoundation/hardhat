import { Transaction, TxData, TxOptions } from "@ethereumjs/tx";
import {
  BN,
  BufferLike,
  bufferToInt,
  ecrecover,
  PrefixedHexString,
  rlphash,
  toBuffer,
  unpadBuffer,
} from "ethereumjs-util";

import { InternalError } from "../errors";

// tslint:disable only-hardhat-error

/**
 * Custom Transaction class to avoid EIP155 errors when hardhat is forked
 */
export class ForkTransaction extends Transaction {
  private readonly _chainId: number;

  constructor(chainId: number, data: TxData = {}, opts: TxOptions = {}) {
    super(data, opts);

    this._chainId = chainId;

    const msgHash = this.hash();

    // v,r,s cast to any because their type is BN | undefined.
    // Not assignable to 'BNLike'.
    const senderPubKey = ecrecover(
      msgHash,
      (this as any).v,
      (this as any).r.toBuffer(),
      (this as any).s.toBuffer(),
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

  public sign(): Transaction {
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

  public validate(stringError?: false): boolean;
  public validate(stringError: true): string[];
  public validate(stringError: boolean = false): boolean | string[] {
    throw new InternalError("`validate` is not implemented in ForkTransaction");
  }

  public toCreationAddress(): boolean {
    throw new InternalError(
      "`toCreationAddress` is not implemented in ForkTransaction"
    );
  }

  // Ported from ethereumjs-tx `tx.hash(false)`
  public hash(): Buffer {
    let items;

    if (this._implementsEIP155()) {
      items = [
        ...this.raw().slice(0, 6),
        toBuffer(this.getChainId()),
        unpadBuffer(toBuffer(0)),
        unpadBuffer(toBuffer(0)),
      ];
    } else {
      items = this.raw().slice(0, 6);
    }

    // create hash
    return rlphash(items);
  }

  private _implementsEIP155(): boolean {
    const onEIP155BlockOrLater = this.common.gteHardfork("spuriousDragon");

    if (!this.isSigned()) {
      // We sign with EIP155 all unsigned transactions after spuriousDragon
      return onEIP155BlockOrLater;
    }

    // EIP155 spec:
    // If block.number >= 2,675,000 and v = CHAIN_ID * 2 + 35 or v = CHAIN_ID * 2 + 36, then when computing
    // the hash of a transaction for purposes of signing or recovering, instead of hashing only the first six
    // elements (i.e. nonce, gasprice, startgas, to, value, data), hash nine elements, with v replaced by
    // CHAIN_ID, r = 0 and s = 0.
    const v = bufferToInt(this.v!.toBuffer());

    const vAndChainIdMeetEIP155Conditions =
      v === this.getChainId() * 2 + 35 || v === this.getChainId() * 2 + 36;
    return vAndChainIdMeetEIP155Conditions && onEIP155BlockOrLater;
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
