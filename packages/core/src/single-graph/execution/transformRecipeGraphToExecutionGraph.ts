import { Journal } from "../../journal/types";
import { Providers } from "../../providers";
import { Services } from "../../services/types";
import { Artifact } from "../../types";
import {
  ContractCall,
  ContractDeploy,
  DeployedContract,
  ExecutionVertex,
  IExecutionGraph,
  LibraryDeploy,
} from "../types/executionGraph";
import {
  ArtifactContractRecipeVertex,
  ArtifactLibraryRecipeVertex,
  CallRecipeVertex,
  DeployedContractRecipeVertex,
  HardhatContractRecipeVertex,
  HardhatLibraryRecipeVertex,
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
  return (recipeVertex: RecipeVertex): Promise<ExecutionVertex> => {
    switch (recipeVertex.type) {
      case "HardhatContract":
        return convertHardhatContractToContractDeploy(recipeVertex, services);
      case "ArtifactContract":
        return convertArtifactContractToContractDeploy(recipeVertex, services);
      case "DeployedContract":
        return convertDeployedContractToDeployedDeploy(recipeVertex, services);
      case "Call":
        return convertCallToContractCall(recipeVertex, services);
      case "HardhatLibrary":
        return convertHardhatLibraryToLibraryDeploy(recipeVertex, services);
      case "ArtifactLibrary":
        return convertArtifactLibraryToLibraryDeploy(recipeVertex, services);
      default:
        return assertRecipeVertexNotExpected(recipeVertex);
    }
  };
}

async function convertHardhatContractToContractDeploy(
  vertex: HardhatContractRecipeVertex,
  services: Services
): Promise<ContractDeploy> {
  const artifact: Artifact = await services.artifacts.getArtifact(
    vertex.contractName
  );

  return {
    type: "ContractDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact,
    args: vertex.args,
    libraries: vertex.libraries,
  };
}

async function convertArtifactContractToContractDeploy(
  vertex: ArtifactContractRecipeVertex,
  _services: Services
): Promise<ContractDeploy> {
  return {
    type: "ContractDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: vertex.args,
    libraries: vertex.libraries,
  };
}

async function convertDeployedContractToDeployedDeploy(
  vertex: DeployedContractRecipeVertex,
  _services: Services
): Promise<DeployedContract> {
  return {
    type: "DeployedContract",
    id: vertex.id,
    label: vertex.label,
    address: vertex.address,
    abi: vertex.abi,
  };
}

async function convertCallToContractCall(
  vertex: CallRecipeVertex,
  _services: Services
): Promise<ContractCall> {
  return {
    type: "ContractCall",
    id: vertex.id,
    label: vertex.label,

    contract: vertex.contract,
    method: vertex.method,
    args: vertex.args,
  };
}

async function convertHardhatLibraryToLibraryDeploy(
  hardhatLibraryRecipeVertex: HardhatLibraryRecipeVertex,
  services: Services
): Promise<LibraryDeploy> {
  const artifact: Artifact = await services.artifacts.getArtifact(
    hardhatLibraryRecipeVertex.libraryName
  );

  return {
    type: "LibraryDeploy",
    id: hardhatLibraryRecipeVertex.id,
    label: hardhatLibraryRecipeVertex.label,
    artifact,
    args: hardhatLibraryRecipeVertex.args,
  };
}

async function convertArtifactLibraryToLibraryDeploy(
  vertex: ArtifactLibraryRecipeVertex,
  _services: Services
): Promise<LibraryDeploy> {
  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: vertex.args,
  };
}

function assertRecipeVertexNotExpected(
  vertex: never
): Promise<ExecutionVertex> {
  const v: any = vertex;

  const obj = typeof v === "object" && "type" in v ? v.type : v;

  throw new Error(`Type not expected: ${obj}`);
}
