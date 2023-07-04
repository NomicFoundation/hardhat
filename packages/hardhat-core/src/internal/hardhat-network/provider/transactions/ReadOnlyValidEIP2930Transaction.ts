import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  AccessListEIP2930Transaction,
  AccessListEIP2930TxData,
  AccessListEIP2930ValuesArray,
  TxOptions,
} from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

import { InternalError } from "../../../core/providers/errors";
import * as BigIntUtils from "../../../util/bigint";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

/**
 * This class is like `ReadOnlyValidTransaction` but for
 * EIP-2930 (access list) transactions.
 */
export class ReadOnlyValidEIP2930Transaction extends AccessListEIP2930Transaction {
  public static fromTxData(
    _txData: AccessListEIP2930TxData,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromTxData` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public static fromSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public static fromRlpSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public static fromValuesArray(
    _values: AccessListEIP2930ValuesArray,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public readonly common: Common;

  private readonly _sender: Address;

  constructor(sender: Address, data: AccessListEIP2930TxData = {}) {
    const fakeCommon = Common.custom(
      {
        chainId: BigIntUtils.fromBigIntLike(data.chainId),
      },
      {
        hardfork: "berlin",
      }
    );

    super(data, {
      freeze: false,
      disableMaxInitCodeSizeCheck: true,
      common: fakeCommon,
    });

    this.common = fakeCommon;
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
      "`sign` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public getDataFee(): never {
    throw new InternalError(
      "`getDataFee` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public getBaseFee(): never {
    throw new InternalError(
      "`getBaseFee` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public getUpfrontCost(): never {
    throw new InternalError(
      "`getUpfrontCost` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public validate(stringError?: false): never;
  public validate(stringError: true): never;
  public validate(_stringError: boolean = false): never {
    throw new InternalError(
      "`validate` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public toCreationAddress(): never {
    throw new InternalError(
      "`toCreationAddress` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public getSenderPublicKey(): never {
    throw new InternalError(
      "`getSenderPublicKey` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public getMessageToVerifySignature(): never {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }

  public getMessageToSign(): never {
    throw new InternalError(
      "`getMessageToSign` is not implemented in ReadOnlyValidEIP2930Transaction"
    );
  }
}
