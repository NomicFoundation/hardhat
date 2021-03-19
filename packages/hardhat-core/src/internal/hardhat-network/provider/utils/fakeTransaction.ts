import Common from "@ethereumjs/common";
import { Transaction, TxData, TxOptions } from "@ethereumjs/tx";
import {
  Address,
  AddressLike,
  BN,
  bufferToInt,
  rlphash,
  toBuffer,
  unpadBuffer,
} from "ethereumjs-util";

import { TransactionParams } from "../node-types";

export interface FakeTxData extends TxData {
  from?: AddressLike;
}

type ArrayWithFrom<T> = T[] & { from?: string };

export class FakeTransaction extends Transaction {
  public static fromValuesArray(
    values: ArrayWithFrom<Buffer>,
    opts: TxOptions = {}
  ) {
    const [nonce, gasPrice, gasLimit, to, value, data, v, r, s, from] = values;

    const emptyBuffer = Buffer.from([]);

    return new FakeTransaction(
      {
        from: values.from,
        nonce: new BN(nonce),
        gasPrice: new BN(gasPrice),
        gasLimit: new BN(gasLimit),
        to: to !== undefined ? new Address(to) : undefined,
        value: new BN(value),
        data: data ?? emptyBuffer,
        v: v !== undefined && !v.equals(emptyBuffer) ? new BN(v) : undefined,
        r: r !== undefined && !r.equals(emptyBuffer) ? new BN(r) : undefined,
        s: s !== undefined && !s.equals(emptyBuffer) ? new BN(s) : undefined,
      },
      opts
    );
  }
  public fakeFrom: Address;

  constructor(txParams: FakeTxData, txOptions: TxOptions) {
    const _fakeFrom = new Address(toBuffer(txParams.from));

    // `delete` requires that property is optional. Really
    // harhdhat/TransactionParams is used as @ethereumjs/TxData
    // (which has no `from`) here
    delete (txParams as any).from;

    super(txParams, { ...txOptions, freeze: false });
    this.fakeFrom = _fakeFrom;
  }

  public getSenderAddress(): Address {
    return this.fakeFrom;
  }

  // Ported from ethereumjs-tx `tx.hash(false)`
  public hash(): Buffer {
    let items;

    if (this._implementsEIP155()) {
      items = [
        ...this.raw().slice(0, 6),
        toBuffer(this.getChainId()),
        unpadBuffer(toBuffer(0)),
        unpadBuffer(toBuffer(0)),
      ];
    } else {
      items = this.raw().slice(0, 6);
    }

    // create hash
    return rlphash(items);
  }

  private _implementsEIP155(): boolean {
    const onEIP155BlockOrLater = this.common.gteHardfork("spuriousDragon");

    if (!this.isSigned()) {
      // We sign with EIP155 all unsigned transactions after spuriousDragon
      return onEIP155BlockOrLater;
    }

    // EIP155 spec:
    // If block.number >= 2,675,000 and v = CHAIN_ID * 2 + 35 or v = CHAIN_ID * 2 + 36, then when computing
    // the hash of a transaction for purposes of signing or recovering, instead of hashing only the first six
    // elements (i.e. nonce, gasprice, startgas, to, value, data), hash nine elements, with v replaced by
    // CHAIN_ID, r = 0 and s = 0.
    const v = bufferToInt(this.v!.toBuffer());

    const vAndChainIdMeetEIP155Conditions =
      v === this.getChainId() * 2 + 35 || v === this.getChainId() * 2 + 36;
    return vAndChainIdMeetEIP155Conditions && onEIP155BlockOrLater;
  }
}
