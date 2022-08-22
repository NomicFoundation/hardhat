import { Journal } from "../../journal/types";
import { Providers } from "../../providers";
import { Services } from "../../services/types";
import { Artifact } from "../../types";
import { ExecutionGraph } from "../execution/ExecutionGraph";
import { createServices } from "../services/createServices";
import {
  ContractCall,
  ContractDeploy,
  DeployedContract,
  ExecutionVertex,
  IExecutionGraph,
  LibraryDeploy,
} from "../types/executionGraph";
import { RecipeFuture } from "../types/future";
import { isFuture } from "../types/guards";
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
import { clone } from "../utils/adjacencyList";

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

  const executionGraph: IExecutionGraph = await convertRecipeToExecution(
    recipeGraph,
    convertRecipeVertexToExecutionVertex(services)
  );

  return { _kind: "success", executionGraph };
}

async function convertRecipeToExecution(
  recipeGraph: IRecipeGraph,
  convert: (vertex: RecipeVertex) => Promise<ExecutionVertex>
) {
  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = clone(recipeGraph.adjacencyList);

  for (const [id, recipeVertex] of recipeGraph.vertexes.entries()) {
    const executionVertex = await convert(recipeVertex);

    executionGraph.vertexes.set(id, executionVertex);
  }

  return executionGraph;
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
    args: await convertArgs(vertex.args, services),
    libraries: vertex.libraries,
  };
}

async function convertArtifactContractToContractDeploy(
  vertex: ArtifactContractRecipeVertex,
  services: Services
): Promise<ContractDeploy> {
  return {
    type: "ContractDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: await convertArgs(vertex.args, services),
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
  services: Services
): Promise<ContractCall> {
  return {
    type: "ContractCall",
    id: vertex.id,
    label: vertex.label,

    contract: vertex.contract,
    method: vertex.method,
    args: await convertArgs(vertex.args, services),
  };
}

async function convertHardhatLibraryToLibraryDeploy(
  vertex: HardhatLibraryRecipeVertex,
  services: Services
): Promise<LibraryDeploy> {
  const artifact: Artifact = await services.artifacts.getArtifact(
    vertex.libraryName
  );

  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact,
    args: await convertArgs(vertex.args, services),
  };
}

async function convertArtifactLibraryToLibraryDeploy(
  vertex: ArtifactLibraryRecipeVertex,
  services: Services
): Promise<LibraryDeploy> {
  return {
    type: "LibraryDeploy",
    id: vertex.id,
    label: vertex.label,
    artifact: vertex.artifact,
    args: await convertArgs(vertex.args, services),
  };
}

function assertRecipeVertexNotExpected(
  vertex: never
): Promise<ExecutionVertex> {
  const v: any = vertex;

  const obj = typeof v === "object" && "type" in v ? v.type : v;

  throw new Error(`Type not expected: ${obj}`);
}

async function convertArgs(
  args: Array<string | number | RecipeFuture>,
  services: Services
): Promise<Array<string | number | RecipeFuture>> {
  const resolvedArgs = [];

  for (const arg of args) {
    const resolvedArg = await convertArg(arg, services);

    resolvedArgs.push(resolvedArg);
  }

  return resolvedArgs;
}

async function convertArg(
  arg: string | number | RecipeFuture,
  services: Services
) {
  if (!isFuture(arg)) {
    return arg;
  }

  if (arg.type !== "parameter") {
    return arg;
  }

  const param = await services.config.getParam(arg.label);

  if (param === undefined) {
    throw new Error(`No param for ${arg.label}`);
  }

  return param;
}
