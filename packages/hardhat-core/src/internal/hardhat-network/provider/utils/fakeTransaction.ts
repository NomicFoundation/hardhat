import Common from "@ethereumjs/common";
import { Transaction, TxData, TxOptions } from "@ethereumjs/tx";
import {
  Address,
  AddressLike,
  bufferToInt,
  rlphash,
  toBuffer,
  unpadBuffer,
} from "ethereumjs-util";

import { TransactionParams } from "../node-types";

export interface FakeTxData extends TxData {
  from?: AddressLike;
}

export class FakeTransaction extends Transaction {
  private _from: Address;

  constructor(txParams: FakeTxData, txOptions: TxOptions) {
    const from = new Address(toBuffer(txParams.from));

    // `delete` requires property is optional. Really
    // harhdhat/TransactionParams is used as @ethereumjs/TxData
    // (which has no `from`) here
    delete (txParams as any).from;

    super(txParams, { ...txOptions, freeze: false });
    this._from = from;
  }

  public getSenderAddress(): Address {
    return this._from;
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
