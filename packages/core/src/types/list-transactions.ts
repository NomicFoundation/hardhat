import type { SolidityParameterType } from "./module";

/**
 * The status of a transaction.
 *
 * @beta
 */
export enum TransactionStatus {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  DROPPED = "DROPPED",
  PENDING = "PENDING",
}

/**
 * The information of a transaction.
 *
 * @beta
 */
export interface TransactionInfo {
  type: string;
  status: TransactionStatus;
  txHash: string;
  from: string;
  to?: string;
  name?: string; // can be contract name, function name, or undefined, depending on the type
  address?: string;
  params?: SolidityParameterType[];
  value?: bigint;
  browserUrl?: string;
}

/**
 * An array of transaction information.
 *
 * @beta
 */
export type ListTransactionsResult = TransactionInfo[];
