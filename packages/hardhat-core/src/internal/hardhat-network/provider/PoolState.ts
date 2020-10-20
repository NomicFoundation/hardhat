import { Transaction } from "ethereumjs-tx";
import { BN } from "ethereumjs-util";
import {
  List as ImmutableList,
  Map as ImmutableMap,
  Record as ImmutableRecord,
} from "immutable";

export type SerializedTransaction = ImmutableList<string>;
export type OrderedRecord = ImmutableRecord<ImmutableOrderedTransaction>;
export type SenderTransactions = ImmutableList<OrderedRecord>;
export type AddressToTransactions = ImmutableMap<string, SenderTransactions>;

export interface OrderedTransaction {
  orderId: number;
  data: Transaction;
}

export interface ImmutableOrderedTransaction {
  orderId: number;
  data: SerializedTransaction;
}

export const makeOrderedTransaction = ImmutableRecord<
  ImmutableOrderedTransaction
>({
  orderId: 0,
  data: ImmutableList(),
});

export interface PoolState {
  pendingTransactions: AddressToTransactions; // address => list of serialized pending Transactions
  queuedTransactions: AddressToTransactions; // address => list of serialized queued Transactions
  executableNonces: ImmutableMap<string, string>; // address => nonce (hex)
  blockGasLimit: BN;
}

export const makePoolState = ImmutableRecord<PoolState>({
  pendingTransactions: ImmutableMap(),
  queuedTransactions: ImmutableMap(),
  executableNonces: ImmutableMap(),
  blockGasLimit: new BN(9500000),
});
