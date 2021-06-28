import Common from "@ethereumjs/common";
import {
  AccessListEIP2930Transaction,
  AccessListEIP2930TxData,
  AccessListEIP2930ValuesArray,
  TxOptions,
} from "@ethereumjs/tx";
import { Address, BN } from "ethereumjs-util";

import { InternalError } from "../../../core/providers/errors";

/* eslint-disable @nomiclabs/only-hardhat-error */

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
    const fakeCommon = new Common({
      chain: "mainnet",
    });

    // this class should only be used with txs in a hardfork that
    // supports EIP-2930
    (fakeCommon as any).isActivatedEIP = (eip: number) => {
      if (eip === 2930) {
        return true;
      }

      throw new Error("Expected `isActivatedEIP` to only be called with 2930");
    };

    // this class should only be used with EIP-2930 txs,
    // which (we assume) always have a defined `chainId` value
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
