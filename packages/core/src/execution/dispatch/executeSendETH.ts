import type { PopulatedTransaction } from "ethers";

import { ExecutionContext } from "types/deployment";
import { SentETH } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeSendETH(
  { address, value }: SentETH,
  resultAccumulator: Map<number, VertexVisitResult | null>,
  { services, options }: ExecutionContext
): Promise<VertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const to = toAddress(resolve(address));

  let txHash: string;
  try {
    const tx: PopulatedTransaction = { to, value };

    txHash = await services.contracts.sendTx(tx, options);
  } catch (err) {
    return {
      _kind: "failure",
      failure: err as any,
    };
  }

  await services.transactions.wait(txHash);

  return {
    _kind: "success",
    result: {
      hash: txHash,
    },
  };
}
