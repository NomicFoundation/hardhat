import * as rlp from "@nomicfoundation/ethereumjs-rlp";
import { FeeMarketEIP1559Transaction } from "@nomicfoundation/ethereumjs-tx";
import {
  FeeMarketEIP1559TxData,
  FeeMarketEIP1559ValuesArray,
  TxOptions,
} from "@nomicfoundation/ethereumjs-tx/dist/types";
import {
  Address,
  arrToBufArr,
  bufferToInt,
} from "@nomicfoundation/ethereumjs-util";

import {
  InternalError,
  InvalidArgumentsError,
} from "../../../core/providers/errors";
import { makeFakeSignature } from "../utils/makeFakeSignature";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

/**
 * This class is the EIP-1559 version of FakeSenderTransaction.
 */
export class FakeSenderEIP1559Transaction extends FeeMarketEIP1559Transaction {
  public static fromTxData(
    _txData: FeeMarketEIP1559TxData,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromTxData` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public static fromSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromSerializedTx` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public static fromRlpSerializedTx(
    _serialized: Buffer,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromRlpSerializedTx` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public static fromValuesArray(
    _values: FeeMarketEIP1559ValuesArray,
    _opts?: TxOptions
  ): never {
    throw new InternalError(
      "`fromValuesArray` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public static fromSenderAndRlpSerializedTx(
    sender: Address,
    serialized: Buffer,
    opts?: TxOptions
  ) {
    if (serialized[0] !== 2) {
      throw new InvalidArgumentsError(
        `Invalid serialized tx input: not an EIP-1559 transaction (wrong tx type, expected: 2, received: ${serialized[0]}`
      );
    }

    const values = arrToBufArr(rlp.decode(serialized.slice(1)));

    checkIsFeeMarketEIP1559ValuesArray(values);

    return this.fromSenderAndValuesArray(sender, values, opts);
  }

  public static fromSenderAndValuesArray(
    sender: Address,
    values: FeeMarketEIP1559ValuesArray,
    opts: TxOptions = {}
  ): FakeSenderEIP1559Transaction {
    const [
      chainId,
      nonce,
      maxPriorityFeePerGas,
      maxFeePerGas,
      gasLimit,
      to,
      value,
      data,
      accessList,
      v,
      r,
      s,
    ] = values;

    return new FakeSenderEIP1559Transaction(
      sender,
      {
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasLimit,
        to: to !== undefined && to.length > 0 ? to : undefined,
        value,
        data: data ?? Buffer.from([]),
        accessList: accessList ?? [],
        v: v !== undefined ? bufferToInt(v) : undefined, // EIP1559 supports v's with value 0 (empty Buffer)
        r: r !== undefined && r.length !== 0 ? bufferToInt(r) : undefined,
        s: s !== undefined && s.length !== 0 ? bufferToInt(s) : undefined,
      },
      opts
    );
  }

  private readonly _sender: Address;

  constructor(
    sender: Address,
    data: FeeMarketEIP1559TxData = {},
    opts?: TxOptions
  ) {
    const fakeSignature = makeFakeSignature(data, sender);

    super(
      {
        ...data,
        v: data.v ?? 1,
        r: data.r ?? fakeSignature.r,
        s: data.s ?? fakeSignature.s,
      },
      { ...opts, freeze: false, disableMaxInitCodeSizeCheck: true }
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
      "`getSenderPublicKey` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public _processSignature(_v: bigint, _r: Buffer, _s: Buffer): never {
    throw new InternalError(
      "`_processSignature` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public sign(_privateKey: Buffer): never {
    throw new InternalError(
      "`sign` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public getMessageToSign(): never {
    throw new InternalError(
      "`getMessageToSign` is not implemented in FakeSenderEIP1559Transaction"
    );
  }

  public getMessageToVerifySignature(): never {
    throw new InternalError(
      "`getMessageToVerifySignature` is not implemented in FakeSenderEIP1559Transaction"
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

function checkIsFeeMarketEIP1559ValuesArray(
  values: unknown
): asserts values is FeeMarketEIP1559ValuesArray {
  if (!Array.isArray(values)) {
    throw new InvalidArgumentsError(
      `Invalid deserialized tx. Expected a Buffer[], but got '${values as any}'`
    );
  }

  if (values.length !== 9 && values.length !== 12) {
    throw new InvalidArgumentsError(
      "Invalid EIP-1559 transaction. Only expecting 9 values (for unsigned tx) or 12 values (for signed tx)."
    );
  }

  // all elements in the array are buffers, except the 9th one that is an
  // AccessListBuffer (an array of AccessListBufferItems)
  for (const [i, value] of values.entries()) {
    if (i === 8) {
      if (!Array.isArray(value)) {
        // we could check more things to assert that it's an AccessListBuffer,
        // but we're assuming that just checking if it's an array is enough
        throw new InvalidArgumentsError(
          `Invalid deserialized tx. Expected a AccessListBuffer in position ${i}, but got '${value}'`
        );
      }
    } else {
      if (!Buffer.isBuffer(values[i])) {
        throw new InvalidArgumentsError(
          `Invalid deserialized tx. Expected a Buffer in position ${i}, but got '${value}'`
        );
      }
    }
  }
}
