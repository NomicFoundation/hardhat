import { Common } from "@nomicfoundation/ethereumjs-common";
import { Transaction, TxData, TxOptions } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

import { InternalError } from "../../../core/providers/errors";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

/**
 * This class is like `ReadOnlyValidTransaction` but for
 * a transaction with an unknown tx type.
 */
export class ReadOnlyValidUnknownTypeTransaction extends Transaction {
  public static fromTxData(_txData: TxData, _opts?: TxOptions): never {
    throw new InternalError(
      "`fromTxData` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public static fromSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public static fromRlpSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public static fromValuesArray(_values: Buffer[], _opts?: TxOptions): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public readonly common: Common;

  private readonly _sender: Address;
  private readonly _actualType: number;

  constructor(sender: Address, type: number, data: TxData = {}) {
    super(data, { freeze: false, disableMaxInitCodeSizeCheck: true });

    this.common = this._getCommon();
    this._sender = sender;
    this._actualType = type;
  }

  public get type(): number {
    return this._actualType;
  }

  public verifySignature(): boolean {
    return true;
  }

  public getSenderAddress(): Address {
    return this._sender;
  }

  public sign(): never {
    throw new InternalError(
      "`sign` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public getDataFee(): never {
    throw new InternalError(
      "`getDataFee` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public getBaseFee(): never {
    throw new InternalError(
      "`getBaseFee` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public getUpfrontCost(): never {
    throw new InternalError(
      "`getUpfrontCost` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public validate(_stringError?: false): never;
  public validate(_stringError: true): never;
  public validate(_stringError: boolean = false): never {
    throw new InternalError(
      "`validate` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public toCreationAddress(): never {
    throw new InternalError(
      "`toCreationAddress` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public getSenderPublicKey(): never {
    throw new InternalError(
      "`getSenderPublicKey` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public getMessageToVerifySignature(): never {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }

  public getMessageToSign(): never {
    throw new InternalError(
      "`getMessageToSign` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  }
}

// Override private methods

const ReadOnlyValidUnknownTypeTransactionPrototype: any =
  ReadOnlyValidUnknownTypeTransaction.prototype;

ReadOnlyValidUnknownTypeTransactionPrototype._validateTxV = function (
  _v: any,
  common: any
) {
  return this._getCommon(common);
};

ReadOnlyValidUnknownTypeTransactionPrototype._signedTxImplementsEIP155 =
  function () {
    throw new InternalError(
      "`_signedTxImplementsEIP155` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  };

ReadOnlyValidUnknownTypeTransactionPrototype._unsignedTxImplementsEIP155 =
  function () {
    throw new InternalError(
      "`_unsignedTxImplementsEIP155` is not implemented in ReadOnlyValidUnknownTypeTransaction"
    );
  };

ReadOnlyValidUnknownTypeTransactionPrototype._getMessageToSign = function () {
  throw new InternalError(
    "`_getMessageToSign` is not implemented in ReadOnlyValidUnknownTypeTransaction"
  );
};

ReadOnlyValidUnknownTypeTransactionPrototype._processSignature = function () {
  throw new InternalError(
    "`_processSignature` is not implemented in ReadOnlyValidUnknownTypeTransaction"
  );
};
