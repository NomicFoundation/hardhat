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
import { AdjacencyList } from "./graph";
import { Artifact } from "./hardhat";

export interface IRecipeGraph {
  vertexes: Map<number, RecipeVertex>;
  adjacencyList: AdjacencyList;
  registeredParameters: {
    [key: string]: { [key: string]: string | number | RecipeFuture };
  };
  toMermaid(): string;
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

export interface HardhatContractRecipeVertex {
  id: number;
  type: "HardhatContract";
  label: string;
  scopeAdded: string;
  contractName: string;
  args: InternalParamValue[];
  libraries: LibraryMap;
}

export interface ArtifactContractRecipeVertex {
  id: number;
  type: "ArtifactContract";
  label: string;
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  libraries: LibraryMap;
}

export interface DeployedContractRecipeVertex {
  id: number;
  type: "DeployedContract";
  label: string;
  scopeAdded: string;
  address: string;
  abi: any[];
}

export interface HardhatLibraryRecipeVertex {
  id: number;
  type: "HardhatLibrary";
  libraryName: string;
  label: string;
  scopeAdded: string;
  args: InternalParamValue[];
}

export interface ArtifactLibraryRecipeVertex {
  id: number;
  type: "ArtifactLibrary";
  label: string;
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
}

export interface CallRecipeVertex {
  id: number;
  type: "Call";
  label: string;
  scopeAdded: string;
  contract: CallableFuture;
  method: string;
  args: InternalParamValue[];
  after: RecipeFuture[];
}

export interface VirtualVertex {
  id: number;
  type: "Virtual";
  label: string;
  scopeAdded: string;
  after: RecipeFuture[];
}

export interface ContractOptions {
  args?: InternalParamValue[];
  libraries?: {
    [key: string]: RecipeFuture;
  };
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
    abi: any[]
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
  steps: (builder: IRecipeGraphBuilder) => FutureDict;
}

export interface RecipeGraphBuilderOptions {
  chainId: number;
}
