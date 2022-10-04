import { Services } from "services/types";
import { ContractCall } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeContractCall(
  { method, contract, args }: ContractCall,
  resultAccumulator: Map<number, VertexVisitResult | null>,
  { services }: { services: Services }
): Promise<VertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  let txHash: string;
  try {
    txHash = await services.contracts.call(address, abi, method, resolvedArgs);
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
