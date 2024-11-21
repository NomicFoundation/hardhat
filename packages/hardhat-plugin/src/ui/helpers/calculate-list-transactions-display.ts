import { ListTransactionsResult } from "@nomicfoundation/ignition-core";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { stringify } from "json5";

export function calculateListTransactionsDisplay(
  deploymentId: string,
  listTransactionsResult: ListTransactionsResult
): string {
  let text = `Logging transactions for deployment ${deploymentId}\n\n`;

  for (const [index, transaction] of listTransactionsResult.entries()) {
    text += `Transaction ${index + 1}:\n`;
    text += `  - Type: ${transactionTypeToDisplayType(transaction.type)}\n`;
    text += `  - Status: ${transaction.status}\n`;
    text += `  - TxHash: ${transaction.txHash}\n`;
    text += `  - From: ${transaction.from}\n`;

    if (transaction.to !== undefined) {
      text += `  - To: ${transaction.to}\n`;
    }

    if (transaction.name !== undefined) {
      text += `  - Name: ${transaction.name}\n`;
    }

    if (transaction.address !== undefined) {
      text += `  - Address: ${transaction.address}\n`;
    }

    if (transaction.params !== undefined) {
      text += `  - Params: ${stringify(
        transaction.params,
        transactionDisplaySerializeReplacer
      )}\n`;
    }

    if (transaction.value !== undefined) {
      text += `  - Value: ${transaction.value}\n`;
    }

    text += "\n";
  }

  return text;
}

function transactionTypeToDisplayType(type: string): string {
  switch (type) {
    case "DEPLOYMENT_EXECUTION_STATE":
      return "Contract Deployment";
    case "CALL_EXECUTION_STATE":
      return "Function Call";
    case "SEND_DATA_EXECUTION_STATE":
      return "Generic Transaction";
    default:
      throw new NomicLabsHardhatPluginError(
        "hardhat-ignition",
        `Unknown transaction type: ${type}`
      );
  }
}

export function transactionDisplaySerializeReplacer(
  _key: string,
  value: unknown
) {
  if (typeof value === "bigint") {
    return `${value}n`;
  }

  return value;
}
