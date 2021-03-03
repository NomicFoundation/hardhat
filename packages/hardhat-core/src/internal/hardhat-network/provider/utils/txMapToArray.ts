import flatten from "lodash/flatten";

import { OrderedTransaction } from "../PoolState";

export function txMapToArray(transactions: Map<string, OrderedTransaction[]>) {
  return flatten(Array.from(transactions.values())).map((tx) => tx.data);
}
