import { Transaction, TxData, TxOptions } from "@ethereumjs/tx";
import { Address, AddressLike, BN, toBuffer } from "ethereumjs-util";

export interface FakeTxData extends TxData {
  from?: AddressLike;
}

type ArrayWithFrom<T> = T[] & { from?: string };

export class FakeTransaction extends Transaction {
  public static fromValuesArray(
    values: ArrayWithFrom<Buffer>,
    opts: TxOptions = {}
  ) {
    const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = values;

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
}
