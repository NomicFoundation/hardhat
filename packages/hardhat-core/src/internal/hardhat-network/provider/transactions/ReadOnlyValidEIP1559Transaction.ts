import Common from "@ethereumjs/common";
import { FeeMarketEIP1559Transaction, TxOptions } from "@ethereumjs/tx";
import { Address, BN } from "ethereumjs-util";

import {
  FeeMarketEIP1559TxData,
  FeeMarketEIP1559ValuesArray,
} from "@ethereumjs/tx/src/types";
import { InternalError } from "../../../core/providers/errors";

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
    const fakeCommon = new Common({
      chain: "mainnet",
      hardfork: "london",
    });

    // this class should only be used with txs in a hardfork that
    // supports EIP-1559
    (fakeCommon as any).isActivatedEIP = (eip: number) => {
      if (eip === 2930) {
        return true;
      }

      if (eip === 1559) {
        return true;
      }

      throw new Error(
        "Expected `isActivatedEIP` to only be called with 2930 or 1559"
      );
    };

    // this class should only be used with EIP-1559 txs,
    // which always have a `chainId` value
    (fakeCommon as any).chainIdBN = () => {
      if (data.chainId !== undefined) {
        return new BN(data.chainId);
      }

      throw new Error("Expected txData to have a chainId");
    };

    super(data, { freeze: false, common: fakeCommon });

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
