import { Common } from "@nomicfoundation/ethereumjs-common";
import { Transaction, TxData, TxOptions } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

import { InternalError } from "../../../core/providers/errors";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

/**
 * This class represents a transaction that is assumed to be valid.
 *
 * This transaction is not meant to be run. It can only be used to read
 * from its values.
 *
 * The transaction's signature is never validated, but assumed to be valid.
 *
 * The sender's private key is never recovered from the signature. Instead,
 * the sender's address is received as parameter.
 *
 * This class doesn't use its Common instance, so there's no need to provide
 * one.
 */
export class ReadOnlyValidTransaction extends Transaction {
  public static fromTxData(_txData: TxData, _opts?: TxOptions): never {
    throw new InternalError(
      "`fromTxData` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public static fromSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public static fromRlpSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public static fromValuesArray(_values: Buffer[], _opts?: TxOptions): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public readonly common: Common;

  private readonly _sender: Address;

  constructor(sender: Address, data: TxData = {}) {
    super(data, { freeze: false });

    this.common = this._getCommon();
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
      "`sign` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public getDataFee(): never {
    throw new InternalError(
      "`getDataFee` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public getBaseFee(): never {
    throw new InternalError(
      "`getBaseFee` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public getUpfrontCost(): never {
    throw new InternalError(
      "`getUpfrontCost` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public validate(_stringError?: false): never;
  public validate(_stringError: true): never;
  public validate(_stringError: boolean = false): never {
    throw new InternalError(
      "`validate` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public toCreationAddress(): never {
    throw new InternalError(
      "`toCreationAddress` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public getSenderPublicKey(): never {
    throw new InternalError(
      "`getSenderPublicKey` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public getMessageToVerifySignature(): never {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in ReadOnlyValidTransaction"
    );
  }

  public getMessageToSign(): never {
    throw new InternalError(
      "`getMessageToSign` is not implemented in ReadOnlyValidTransaction"
    );
  }
}

// Override private methods

const ReadOnlyValidTransactionPrototype: any =
  ReadOnlyValidTransaction.prototype;

ReadOnlyValidTransactionPrototype._validateTxV = function (
  _v: any,
  common: any
) {
  return this._getCommon(common);
};

ReadOnlyValidTransactionPrototype._signedTxImplementsEIP155 = function () {
  throw new InternalError(
    "`_signedTxImplementsEIP155` is not implemented in ReadOnlyValidTransaction"
  );
};

ReadOnlyValidTransactionPrototype._unsignedTxImplementsEIP155 = function () {
  throw new InternalError(
    "`_unsignedTxImplementsEIP155` is not implemented in ReadOnlyValidTransaction"
  );
};

ReadOnlyValidTransactionPrototype._getMessageToSign = function () {
  throw new InternalError(
    "`_getMessageToSign` is not implemented in ReadOnlyValidTransaction"
  );
};

ReadOnlyValidTransactionPrototype._processSignature = function () {
  throw new InternalError(
    "`_processSignature` is not implemented in ReadOnlyValidTransaction"
  );
};
