import { ethers } from "ethers";

import { deployStateReducer } from "../../src/deployment/deployStateReducer";
import { generateDeploymentGraphFrom } from "../../src/process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "../../src/process/transformDeploymentGraphToExecutionGraph";
import { DeployState, DeployStateCommand } from "../../src/types/deployment";
import { Module } from "../../src/types/module";
import { validateDeploymentGraph } from "../../src/validation/validateDeploymentGraph";
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
    accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
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
    accounts: {
      getAccounts: () => {
        return ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"];
      },
      getSigner: (_address: string) => {
        return new ethers.VoidSigner(_address);
      },
    },
  } as any;

  const { _kind: validationKind } = await validateDeploymentGraph(
    deploymentGraph,
    {},
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
