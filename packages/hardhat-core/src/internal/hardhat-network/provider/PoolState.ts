import { BN } from "ethereumjs-util";
import {
  List as ImmutableList,
  Map as ImmutableMap,
  Record as ImmutableRecord,
} from "immutable";

export type SerializedTransaction = ImmutableList<string>;
export type SenderTransactions = ImmutableList<SerializedTransaction>;
export type AddressToTransactions = ImmutableMap<string, SenderTransactions>;

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
