import { Transaction, TxData, TxOptions } from "@ethereumjs/tx";
import {
  Address,
  BN,
  BufferLike,
  bufferToInt,
  ecrecover,
  PrefixedHexString,
  publicToAddress,
  rlphash,
  toBuffer,
  unpadBuffer,
} from "ethereumjs-util";

import { InternalError } from "../errors";

// tslint:disable only-hardhat-error

/**
 * Custom Transaction class to avoid using Common
 */
export class ForkTransaction extends Transaction {
  private readonly _chainId: number;
  private readonly _sender: Address;
  constructor(
    chainId: number,
    sender: Address,
    data: TxData = {},
    opts: TxOptions = {}
  ) {
    super(data, { ...opts, freeze: false });

    this._chainId = chainId;
    this._sender = sender;
  }

  public verifySignature(): boolean {
    return true;
  }

  public getSenderAddress(): Address {
    return this._sender;
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

  public getSenderPublicKey(): Buffer {
    throw new InternalError(
      "`getSenderPublicKey` is not implemented in ForkTransaction"
    );
  }

  public getMessageToVerifySignature(): Buffer {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in ForkTransaction"
    );
  }

  public getMessageToSign(): Buffer {
    throw new InternalError(
      "`getMessageToSign` is not implemented in ForkTransaction"
    );
  }
}

// override private methods
const ForkTransactionPrototype: any = ForkTransaction.prototype;

ForkTransactionPrototype._validateTxV = function () {};

ForkTransactionPrototype._signedTxImplementsEIP155 = function () {
  return this.v !== 27 && this.v !== 28;
};

ForkTransactionPrototype._unsignedTxImplementsEIP155 = function () {
  throw new InternalError(
    "`_unsignedTxImplementsEIP155` is not implemented in ForkTransaction"
  );
};

ForkTransactionPrototype._getMessageToSign = function () {
  throw new InternalError(
    "`_getMessageToSign` is not implemented in ForkTransaction"
  );
};

ForkTransactionPrototype._processSignature = function () {
  throw new InternalError(
    "`_processSignature` is not implemented in ForkTransaction"
  );
};
