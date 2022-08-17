import { Journal } from "../../journal/types";
import { Providers } from "../../providers";
import { Services } from "../../services/types";
import { Artifact } from "../../types";
import {
  ContractCall,
  ContractDeploy,
  ExecutionVertex,
  IExecutionGraph,
} from "../types/executionGraph";
import {
  CallRecipeVertex,
  HardhatContractRecipeVertex,
  IRecipeGraph,
  RecipeVertex,
} from "../types/recipeGraph";

import { ExecutionGraph } from "./ExecutionGraph";
import { createServices } from "./createServices";

export type TransformResult =
  | {
      _kind: "success";
      executionGraph: IExecutionGraph;
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    };

export async function transformRecipeGraphToExecutionGraph(
  recipeGraph: IRecipeGraph,
  servicesOptions: {
    providers: Providers;
    journal: Journal;
    txPollingInterval: number;
  }
): Promise<TransformResult> {
  const services = createServices(
    "recipeIdTRANSFORM",
    "recipeIdTRANSFORM",
    servicesOptions
  );

  const executionGraph: IExecutionGraph = await ExecutionGraph.from(
    recipeGraph,
    convertRecipeVertexToExecutionVertex(services)
  );

  return { _kind: "success", executionGraph };
}

function convertRecipeVertexToExecutionVertex(
  services: Services
): (recipeVertex: RecipeVertex) => Promise<ExecutionVertex> {
  return (recipeVertex: RecipeVertex) => {
    switch (recipeVertex.type) {
      case "HardhatContract":
        return convertHardhatContractToContractDeploy(recipeVertex, services);
      case "Call":
        return convertCallToContractCall(recipeVertex, services);
      default:
        throw new Error(`Type note expected: ${recipeVertex.type}`);
    }
  };
}

async function convertHardhatContractToContractDeploy(
  hardhatContractRecipeVertex: HardhatContractRecipeVertex,
  services: Services
): Promise<ContractDeploy> {
  const artifact: Artifact = await services.artifacts.getArtifact(
    hardhatContractRecipeVertex.contractName
  );

  return {
    type: "ContractDeploy",
    id: hardhatContractRecipeVertex.id,
    label: hardhatContractRecipeVertex.label,
    artifact,
    args: hardhatContractRecipeVertex.args,
  };
}

async function convertCallToContractCall(
  callRecipeVertex: CallRecipeVertex,
  _services: Services
): Promise<ContractCall> {
  return {
    type: "ContractCall",
    id: callRecipeVertex.id,
    label: callRecipeVertex.label,

    contract: callRecipeVertex.contract,
    method: callRecipeVertex.method,
    args: callRecipeVertex.args,
  };
}
