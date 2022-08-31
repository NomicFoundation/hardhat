import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  List as ImmutableList,
  Map as ImmutableMap,
  Record as ImmutableRecord,
} from "immutable";

import * as BigIntUtils from "../../util/bigint";

export interface OrderedTransaction {
  orderId: number;
  data: TypedTransaction;
}

interface ImmutableOrderedTransaction {
  orderId: number;
  fakeFrom: string | undefined;
  data: string;
  txType: number;
}

export const makeSerializedTransaction =
  ImmutableRecord<ImmutableOrderedTransaction>({
    orderId: 0,
    fakeFrom: undefined,
    data: "",
    txType: 0,
  });

export type SerializedTransaction =
  ImmutableRecord<ImmutableOrderedTransaction>;
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
  pendingTransactions: ImmutableMap<string, SenderTransactions>(),
  queuedTransactions: ImmutableMap<string, SenderTransactions>(),
  hashToTransaction: ImmutableMap<string, SerializedTransaction>(),
  blockGasLimit: BigIntUtils.toHex(9500000),
});
