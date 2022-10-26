import { ethers } from "ethers";

import { Services } from "services/types";
import { HardhatContractDeploymentVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

export async function validateHardhatContract(
  vertex: HardhatContractDeploymentVertex,
  _resultAccumulator: ResultsAccumulator,
  { services }: { services: Services }
): Promise<VertexVisitResult> {
  const artifactExists = await services.artifacts.hasArtifact(
    vertex.contractName
  );

  if (!artifactExists) {
    return {
      _kind: "failure",
      failure: new Error(
        `Artifact with name '${vertex.contractName}' doesn't exist`
      ),
    };
  }

  const artifact = await services.artifacts.getArtifact(vertex.contractName);
  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return {
      _kind: "failure",
      failure: new Error(
        `The constructor of the contract '${vertex.contractName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
      ),
    };
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
