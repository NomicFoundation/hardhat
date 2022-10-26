import { Services } from "services/types";
import { DeploymentGraphVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

export async function validateVirtual(
  _deploymentVertex: DeploymentGraphVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  return {
    _kind: "success",
    result: undefined,
  };
}
