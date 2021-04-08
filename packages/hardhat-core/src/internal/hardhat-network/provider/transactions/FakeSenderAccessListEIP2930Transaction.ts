import { AccessListEIP2930Transaction, TxData } from "@ethereumjs/tx";
import {
  AccessListEIP2930TxData,
  AccessListEIP2930ValuesArray,
  TxOptions,
} from "@ethereumjs/tx/dist/types";
import { Address, BN, rlp } from "ethereumjs-util";

import {
  InternalError,
  InvalidArgumentsError,
} from "../../../core/providers/errors";

// tslint:disable only-hardhat-error

/**
 * This class is the EIP-2930 version of FakeSenderTransaction.
 */
export class FakeSenderAccessListEIP2930Transaction extends AccessListEIP2930Transaction {
  public static fromTxData(
    txData: AccessListEIP2930TxData,
    opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromTxData` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public static fromSerializedTx(serialized: Buffer, opts?: TxOptions): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public static fromRlpSerializedTx(
    serialized: Buffer,
    opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public static fromValuesArray(
    values: AccessListEIP2930ValuesArray,
    opts?: TxOptions
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
        v: v !== undefined ? new BN(v) : undefined, // EIP2930 supports v's with value 0 (empty Buffer)
        r: r !== undefined && r.length !== 0 ? new BN(r) : undefined,
        s: s !== undefined && s.length !== 0 ? new BN(s) : undefined,
      },
      opts
    );
  }

  private readonly _sender: Address;

  public constructor(
    sender: Address,
    data: AccessListEIP2930TxData = {},
    opts?: TxOptions
  ) {
    super(
      {
        ...data,
        v: data.v ?? new BN(1),
        r: data.r ?? new BN(1),
        s: data.s ?? new BN(2),
      },
      { ...opts, freeze: false }
    );

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

  public _processSignature(v: number, r: Buffer, s: Buffer): never {
    throw new InternalError(
      "`_processSignature` is not implemented in FakeSenderAccessListEIP2930Transaction"
    );
  }

  public sign(privateKey: Buffer): never {
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
