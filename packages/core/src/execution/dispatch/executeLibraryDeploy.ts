import { Services } from "services/types";
import { LibraryDeploy } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeLibraryDeploy(
  { artifact, args }: LibraryDeploy,
  resultAccumulator: Map<number, any>,
  { services }: { services: Services }
): Promise<VertexVisitResult> {
  try {
    const resolvedArgs = args
      .map(resolveFrom(resultAccumulator))
      .map(toAddress);

    const txHash = await services.contracts.deploy(artifact, resolvedArgs, {});

    const receipt = await services.transactions.wait(txHash);

    return {
      _kind: "success",
      result: {
        name: artifact.contractName,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        address: receipt.contractAddress,
      },
    };
  } catch (err) {
    return {
      _kind: "failure",
      failure: err as any,
    };
  }
}
