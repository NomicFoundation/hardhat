import { TypedTransaction } from "@ethereumjs/tx";
import { BN } from "ethereumjs-util";
import {
  List as ImmutableList,
  Map as ImmutableMap,
  Record as ImmutableRecord,
} from "immutable";

import { FakeSenderTransaction } from "./transactions/FakeSenderTransaction";
import { bnToHex } from "./utils/bnToHex";

export interface OrderedTransaction {
  orderId: number;
  data: TypedTransaction | FakeSenderTransaction;
}

interface ImmutableOrderedTransaction {
  orderId: number;
  fakeFrom: string | undefined;
  data: string;
}

export const makeSerializedTransaction = ImmutableRecord<
  ImmutableOrderedTransaction
>({
  orderId: 0,
  fakeFrom: undefined,
  data: "",
});

export type SerializedTransaction = ImmutableRecord<
  ImmutableOrderedTransaction
>;
export type SenderTransactions = ImmutableList<SerializedTransaction>;
export type AddressToTransactions = ImmutableMap<string, SenderTransactions>;
export type HashToTransaction = ImmutableMap<string, SerializedTransaction>;

export interface PoolState {
  pendingTransactions: AddressToTransactions; // address => list of serialized pending Transactions
  queuedTransactions: AddressToTransactions; // address => list of serialized queued Transactions
  hashToTransaction: HashToTransaction;
  blockGasLimit: string;
}

export const makePoolState = ImmutableRecord<PoolState>({
  pendingTransactions: ImmutableMap(),
  queuedTransactions: ImmutableMap(),
  hashToTransaction: ImmutableMap(),
  blockGasLimit: bnToHex(new BN(9500000)),
});
