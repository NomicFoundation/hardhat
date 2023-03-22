import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  FeeMarketEIP1559Transaction,
  TxOptions,
} from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

import {
  FeeMarketEIP1559TxData,
  FeeMarketEIP1559ValuesArray,
} from "@nomicfoundation/ethereumjs-tx/src/types";
import { InternalError } from "../../../core/providers/errors";
import * as BigIntUtils from "../../../util/bigint";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

/**
 * This class is like `ReadOnlyValidTransaction` but for EIP-1559 transactions.
 */
export class ReadOnlyValidEIP1559Transaction extends FeeMarketEIP1559Transaction {
  public static fromTxData(
    _txData: FeeMarketEIP1559TxData,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromTxData` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public static fromSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public static fromRlpSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public static fromValuesArray(
    _values: FeeMarketEIP1559ValuesArray,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public readonly common: Common;

  private readonly _sender: Address;

  constructor(sender: Address, data: FeeMarketEIP1559TxData = {}) {
    const fakeCommon = Common.custom(
      {
        chainId: BigIntUtils.fromBigIntLike(data.chainId),
      },
      {
        hardfork: "london",
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
      "`sign` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public getDataFee(): never {
    throw new InternalError(
      "`getDataFee` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public getBaseFee(): never {
    throw new InternalError(
      "`getBaseFee` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public getUpfrontCost(): never {
    throw new InternalError(
      "`getUpfrontCost` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public validate(stringError?: false): never;
  public validate(stringError: true): never;
  public validate(_stringError: boolean = false): never {
    throw new InternalError(
      "`validate` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public toCreationAddress(): never {
    throw new InternalError(
      "`toCreationAddress` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public getSenderPublicKey(): never {
    throw new InternalError(
      "`getSenderPublicKey` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public getMessageToVerifySignature(): never {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }

  public getMessageToSign(): never {
    throw new InternalError(
      "`getMessageToSign` is not implemented in ReadOnlyValidEIP1559Transaction"
    );
  }
}
