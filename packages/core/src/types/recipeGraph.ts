import {
  ArtifactContract,
  ArtifactLibrary,
  ContractCall,
  DeployedContract,
  RecipeFuture,
  FutureDict,
  HardhatContract,
  HardhatLibrary,
  OptionalParameter,
  ParameterValue,
  RequiredParameter,
  CallableFuture,
} from "./future";
import { AdjacencyList, VertexDescriptor } from "./graph";
import { Artifact } from "./hardhat";

export interface IRecipeGraph {
  vertexes: Map<number, RecipeVertex>;
  adjacencyList: AdjacencyList;
  registeredParameters: {
    [key: string]: { [key: string]: string | number | RecipeFuture };
  };
  getEdges(): Array<{ from: number; to: number }>;
}

export interface LibraryMap {
  [key: string]: RecipeFuture;
}

export type ExternalParamValue = boolean | string | number;

export type InternalParamValue = ExternalParamValue | RecipeFuture;

export type RecipeVertex =
  | HardhatContractRecipeVertex
  | ArtifactContractRecipeVertex
  | DeployedContractRecipeVertex
  | HardhatLibraryRecipeVertex
  | ArtifactLibraryRecipeVertex
  | CallRecipeVertex
  | VirtualVertex;

export interface HardhatContractRecipeVertex extends VertexDescriptor {
  type: "HardhatContract";
  scopeAdded: string;
  contractName: string;
  args: InternalParamValue[];
  libraries: LibraryMap;
  after: RecipeFuture[];
}

export interface ArtifactContractRecipeVertex extends VertexDescriptor {
  type: "ArtifactContract";
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  libraries: LibraryMap;
  after: RecipeFuture[];
}

export interface DeployedContractRecipeVertex extends VertexDescriptor {
  type: "DeployedContract";
  scopeAdded: string;
  address: string;
  abi: any[];
  after: RecipeFuture[];
}

export interface HardhatLibraryRecipeVertex extends VertexDescriptor {
  type: "HardhatLibrary";
  libraryName: string;
  scopeAdded: string;
  args: InternalParamValue[];
  after: RecipeFuture[];
}

export interface ArtifactLibraryRecipeVertex extends VertexDescriptor {
  type: "ArtifactLibrary";
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  after: RecipeFuture[];
}

export interface CallRecipeVertex extends VertexDescriptor {
  type: "Call";
  scopeAdded: string;
  contract: CallableFuture;
  method: string;
  args: InternalParamValue[];
  after: RecipeFuture[];
}

export interface VirtualVertex extends VertexDescriptor {
  type: "Virtual";
  scopeAdded: string;
  after: RecipeFuture[];
}

export interface ContractOptions {
  args?: InternalParamValue[];
  libraries?: {
    [key: string]: RecipeFuture;
  };
  after?: RecipeFuture[];
}

export interface UseRecipeOptions {
  parameters?: { [key: string]: number | string | RecipeFuture };
}

export interface IRecipeGraphBuilder {
  chainId: number;
  graph: IRecipeGraph;

  contract: (
    contractName: string,
    artifactOrOptions?: Artifact | ContractOptions,
    options?: ContractOptions
  ) => HardhatContract | ArtifactContract;

  contractAt: (
    contractName: string,
    address: string,
    abi: any[],
    options?: { after?: RecipeFuture[] }
  ) => DeployedContract;

  library: (
    contractName: string,
    artifactOrOptions?: Artifact | ContractOptions,
    options?: ContractOptions
  ) => HardhatLibrary | ArtifactLibrary;

  call: (
    contractFuture: RecipeFuture,
    functionName: string,
    {
      args,
    }: {
      args: InternalParamValue[];
      after?: RecipeFuture[];
    }
  ) => ContractCall;

  getParam: (paramName: string) => RequiredParameter;

  getOptionalParam: (
    paramName: string,
    defaultValue: ParameterValue
  ) => OptionalParameter;

  useRecipe: (recipe: Recipe, options?: UseRecipeOptions) => FutureDict;
}

export interface Recipe {
  name: string;
  recipeAction: (builder: IRecipeGraphBuilder) => FutureDict;
}

export interface RecipeGraphBuilderOptions {
  chainId: number;
}
