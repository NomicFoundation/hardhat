import Common from "@ethereumjs/common";
import { Transaction, TxData, TxOptions } from "@ethereumjs/tx";
import { Address, BN, rlp } from "ethereumjs-util";

import { InternalError } from "../../../core/providers/errors";

/* eslint-disable @nomiclabs/only-hardhat-error */

/**
 * This class represents a legacy transaction sent by a sender whose private
 * key we don't control.
 *
 * The transaction's signature is never validated, but assumed to be valid.
 *
 * The sender's private key is never recovered from the signature. Instead,
 * the sender's address is received as parameter.
 */
export class FakeSenderTransaction extends Transaction {
  public static fromTxData(_txData: TxData, _opts?: TxOptions): never {
    throw new InternalError(
      "`fromTxData` is not implemented in FakeSenderTransaction"
    );
  }

  public static fromSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in FakeSenderTransaction"
    );
  }

  public static fromRlpSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in FakeSenderTransaction"
    );
  }

  public static fromValuesArray(_values: Buffer[], _opts?: TxOptions): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in FakeSenderTransaction"
    );
  }

  public static fromSenderAndRlpSerializedTx(
    sender: Address,
    serialized: Buffer,
    opts?: TxOptions
  ) {
    const values = rlp.decode(serialized);

    if (!Array.isArray(values)) {
      throw new Error("Invalid serialized tx input. Must be array");
    }

    return this.fromSenderAndValuesArray(sender, values, opts);
  }

  public static fromSenderAndValuesArray(
    sender: Address,
    values: Buffer[],
    opts?: TxOptions
  ) {
    if (values.length !== 6 && values.length !== 9) {
      throw new InternalError(
        "FakeSenderTransaction initialized with invalid values"
      );
    }

    const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = values;

    return new FakeSenderTransaction(
      sender,
      {
        nonce,
        gasPrice,
        gasLimit,
        to: to !== undefined && to.length > 0 ? to : undefined,
        value,
        data,
        v,
        r,
        s,
      },
      opts
    );
  }

  public readonly common: Common;

  private readonly _sender: Address;

  constructor(sender: Address, data: TxData = {}, opts?: TxOptions) {
    super(
      {
        ...data,
        v: data.v ?? new BN(27),
        r: data.r ?? new BN(1),
        s: data.s ?? new BN(2),
      },
      { ...opts, freeze: false }
    );

    this.common = this._getCommon(opts?.common);
    this._sender = sender;
  }

  public verifySignature(): boolean {
    return true;
  }

  public getSenderAddress(): Address {
    return this._sender;
  }

  public sign(): never {
    throw new InternalError(
      "`sign` is not implemented in FakeSenderTransaction"
    );
  }

  public getSenderPublicKey(): never {
    throw new InternalError(
      "`getSenderPublicKey` is not implemented in FakeSenderTransaction"
    );
  }

  public getMessageToVerifySignature(): never {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in FakeSenderTransaction"
    );
  }

  public getMessageToSign(): never {
    throw new InternalError(
      "`getMessageToSign` is not implemented in FakeSenderTransaction"
    );
  }

  public validate(stringError?: false): boolean;
  public validate(stringError: true): string[];
  public validate(stringError: boolean = false): boolean | string[] {
    if (stringError) {
      return [];
    }

    return true;
  }
}

// Override private methods
const FakeSenderTransactionPrototype: any = FakeSenderTransaction.prototype;

FakeSenderTransactionPrototype._validateTxV = function (_v: any, common: any) {
  return this._getCommon(common);
};

FakeSenderTransactionPrototype._signedTxImplementsEIP155 = function () {
  throw new InternalError(
    "`_signedTxImplementsEIP155` is not implemented in FakeSenderTransaction"
  );
};

FakeSenderTransactionPrototype._unsignedTxImplementsEIP155 = function () {
  throw new InternalError(
    "`_unsignedTxImplementsEIP155` is not implemented in FakeSenderTransaction"
  );
};

FakeSenderTransactionPrototype._getMessageToSign = function () {
  throw new InternalError(
    "`_getMessageToSign` is not implemented in FakeSenderTransaction"
  );
};

FakeSenderTransactionPrototype._processSignature = function () {
  throw new InternalError(
    "`_processSignature` is not implemented in FakeSenderTransaction"
  );
};
