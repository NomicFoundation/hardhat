import { Services } from "services/types";
import { ContractCall } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeContractCall(
  { method, contract, args }: ContractCall,
  resultAccumulator: Map<number, any>,
  { services }: { services: Services }
): Promise<VertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  const txHash = await services.contracts.call(
    address,
    abi,
    method,
    resolvedArgs
  );

  await services.transactions.wait(txHash);

  return {
    _kind: "success",
    result: {
      hash: txHash,
    },
  };
}
