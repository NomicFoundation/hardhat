import { TypedTransaction } from "@ethereumjs/tx";
import { List as ImmutableList, Map as ImmutableMap, Record as ImmutableRecord } from "immutable";
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
export declare const makeSerializedTransaction: ImmutableRecord.Factory<ImmutableOrderedTransaction>;
export declare type SerializedTransaction = ImmutableRecord<ImmutableOrderedTransaction>;
export declare type SenderTransactions = ImmutableList<SerializedTransaction>;
export declare type AddressToTransactions = ImmutableMap<string, SenderTransactions>;
export declare type HashToTransaction = ImmutableMap<string, SerializedTransaction>;
export interface PoolState {
    pendingTransactions: AddressToTransactions;
    queuedTransactions: AddressToTransactions;
    hashToTransaction: HashToTransaction;
    blockGasLimit: string;
}
export declare const makePoolState: ImmutableRecord.Factory<PoolState>;
export {};
//# sourceMappingURL=PoolState.d.ts.map