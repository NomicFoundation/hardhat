import { deployStateReducer } from "deployment/deployStateReducer";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "process/transformDeploymentGraphToExecutionGraph";
import { DeployState, DeployStateCommand } from "types/deployment";
import { Module } from "types/module";
import { validateDeploymentGraph } from "validation/validateDeploymentGraph";

import { getMockServices } from "../helpers";

export function applyActions(
  state: DeployState,
  actions: DeployStateCommand[]
) {
  return actions.reduce(deployStateReducer, state);
}

export async function resolveExecutionGraphFor(module: Module<any>) {
  const { graph: deploymentGraph } = generateDeploymentGraphFrom(module, {
    chainId: 31337,
  });

  const mockServices = {
    ...getMockServices(),
    artifacts: {
      hasArtifact: () => true,
      getArtifact: (name: string) => ({
        _format: "hh-sol-artifact-1",
        contractName: name,
        sourceName: `contracts/${name}.sol`,
        abi: [],
        bytecode: "0x0",
        deployedBytecode: "0x0",
        linkReferences: {},
        deployedLinkReferences: {},
      }),
    },
  } as any;

  const { _kind: validationKind } = await validateDeploymentGraph(
    deploymentGraph,
    mockServices
  );

  if (validationKind === "failure") {
    throw new Error("Cannot resolve graph, failed validation");
  }

  const transformResult = await transformDeploymentGraphToExecutionGraph(
    deploymentGraph,
    mockServices
  );

  if (transformResult._kind === "failure") {
    throw new Error("Cannot resolve graph, failed transform");
  }

  return transformResult.executionGraph;
}
