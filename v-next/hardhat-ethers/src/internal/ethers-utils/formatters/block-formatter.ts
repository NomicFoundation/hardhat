import {
  getAddress,
  getBigInt,
  getNumber,
  type BlockParams,
  type TransactionResponseParams,
} from "ethers";

import { object, allowNull, formatHash, formatData } from "../helpers.js";

import { formatTransactionResponse } from "./transaction-formatter.js";

export function formatBlock(value: any): BlockParams {
  const result = _formatBlock(value);

  result.transactions = value.transactions.map(
    (tx: string | TransactionResponseParams) => {
      if (typeof tx === "string") {
        return tx;
      }
      return formatTransactionResponse(tx);
    },
  );
  return result;
}

const _formatBlock = object({
  hash: allowNull(formatHash),
  parentHash: formatHash,
  number: getNumber,
  timestamp: getNumber,
  nonce: allowNull(formatData),
  difficulty: getBigInt,
  gasLimit: getBigInt,
  gasUsed: getBigInt,
  miner: allowNull(getAddress),
  extraData: formatData,
  baseFeePerGas: allowNull(getBigInt),
});
