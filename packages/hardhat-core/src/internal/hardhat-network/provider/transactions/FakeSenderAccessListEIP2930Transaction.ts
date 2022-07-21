import { Common } from "@ethereumjs/common";
import { AccessListEIP2930Transaction } from "@ethereumjs/tx";
import {
  AccessListEIP2930TxData,
  AccessListEIP2930ValuesArray,
  TxOptions,
} from "@ethereumjs/tx/dist/types";
import { Address, bufferToInt } from "@ethereumjs/util";
import * as rlp from "rlp";

import {
  InternalError,
  InvalidArgumentsError,
} from "../../../core/providers/errors";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

/**
 * This class is the EIP-2930 version of FakeSenderTransaction.
 */
export class FakeSenderAccessListEIP2930Transaction extends AccessListEIP2930Transaction {
  public static fromTxData(
    _txData: AccessListEIP2930TxData,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromTxData` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public static fromSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public static fromRlpSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public static fromValuesArray(
    _values: AccessListEIP2930ValuesArray,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromValuesArray` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public static fromSenderAndRlpSerializedTx(
    sender: Address,
    serialized: Buffer,
    opts?: TxOptions
  ) {
    if (serialized[0] !== 1) {
      throw new InvalidArgumentsError(
        `Invalid serialized tx input: not an EIP-2930 transaction (wrong tx type, expected: 1, received: ${serialized[0]}`
      );
    }

    const values = rlp.decode(serialized.slice(1));

    if (!Array.isArray(values)) {
      throw new InvalidArgumentsError(
        "Invalid serialized tx input. Must be array"
      );
    }

    return this.fromSenderAndValuesArray(sender, values as any, opts);
  }

  public static fromSenderAndValuesArray(
    sender: Address,
    values: AccessListEIP2930ValuesArray,
    opts: TxOptions = {}
  ): FakeSenderAccessListEIP2930Transaction {
    if (values.length !== 8 && values.length !== 11) {
      throw new InvalidArgumentsError(
        "Invalid EIP-2930 transaction. Only expecting 8 values (for unsigned tx) or 11 values (for signed tx)."
      );
    }

    const [
      chainId,
      nonce,
      gasPrice,
      gasLimit,
      to,
      value,
      data,
      accessList,
      v,
      r,
      s,
    ] = values;

    return new FakeSenderAccessListEIP2930Transaction(
      sender,
      {
        chainId,
        nonce,
        gasPrice,
        gasLimit,
        to: to !== undefined && to.length > 0 ? to : undefined,
        value,
        data: data ?? Buffer.from([]),
        accessList: accessList ?? [],
        v: v !== undefined ? bufferToInt(v) : undefined, // EIP2930 supports v's with value 0 (empty Buffer)
        r: r !== undefined && r.length !== 0 ? bufferToInt(r) : undefined,
        s: s !== undefined && s.length !== 0 ? bufferToInt(s) : undefined,
      },
      opts
    );
  }

  public readonly common: Common;

  private readonly _sender: Address;

  constructor(
    sender: Address,
    data: AccessListEIP2930TxData = {},
    opts?: TxOptions
  ) {
    super(
      {
        ...data,
        v: data.v ?? 1,
        r: data.r ?? 1,
        s: data.s ?? 2,
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

  public getSenderPublicKey(): never {
    throw new InternalError(
      "`getSenderPublicKey` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public _processSignature(_v: bigint, _r: Buffer, _s: Buffer): never {
    throw new InternalError(
      "`_processSignature` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public sign(_privateKey: Buffer): never {
    throw new InternalError(
      "`sign` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public getMessageToSign(): never {
    throw new InternalError(
      "`getMessageToSign` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public getMessageToVerifySignature(): never {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in FakeSenderAccessListEIP2930Transaction"
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
