import { Services } from "services/types";
import { DeploymentGraphVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";

export async function validateVirtual(
  _deploymentVertex: DeploymentGraphVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  _context: { services: Services }
): Promise<ValidationVertexVisitResult> {
  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
