import type { ExecutionContext } from "../../types/deployment";
import type {
  ExecutionVertexVisitResult,
  SentETH,
} from "../../types/executionGraph";
import type { PopulatedTransaction } from "ethers";

import { VertexResultEnum } from "../../types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeSendETH(
  { address, value, signer }: SentETH,
  resultAccumulator: Map<number, ExecutionVertexVisitResult | undefined>,
  { services, options }: ExecutionContext
): Promise<ExecutionVertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const to = toAddress(resolve(address));

  let txHash: string;
  try {
    const tx: PopulatedTransaction = {
      to,
      value,
      from: await signer.getAddress(),
    };

    txHash = await services.contracts.sendTx(tx, {
      ...options,
      signer,
    });
  } catch (err) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: err as any,
    };
  }

  try {
    await services.transactions.wait(txHash);
  } catch {
    return {
      _kind: VertexResultEnum.HOLD,
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: {
      hash: txHash,
      value,
    },
  };
}
