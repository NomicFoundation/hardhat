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
} from "./future";
import { Artifact } from "./hardhat";

interface LibraryMap {
  [key: string]: RecipeFuture;
}

export interface HardhatContractRecipeVertex {
  id: number;
  type: "HardhatContract";
  label: string;
  contractName: string;
  args: Array<string | number | RecipeFuture>;
  libraries: LibraryMap;
}

export interface ArtifactContractRecipeVertex {
  id: number;
  type: "ArtifactContract";
  label: string;
  artifact: Artifact;
  args: Array<string | number | RecipeFuture>;
  libraries: LibraryMap;
}

export interface DeployedContractRecipeVertex {
  id: number;
  type: "DeployedContract";
  label: string;
  address: string;
  abi: any[];
}

export interface HardhatLibraryRecipeVertex {
  id: number;
  type: "HardhatLibrary";
  label: string;
  args: Array<string | number | RecipeFuture>;
}

export interface ArtifactLibraryRecipeVertex {
  id: number;
  type: "ArtifactLibrary";
  label: string;
  args: Array<string | number | RecipeFuture>;
}

export interface CallRecipeVertex {
  id: number;
  type: "Call";
  label: string;
  contract: HardhatContract | ArtifactContract | DeployedContract;
  method: string;
  args: Array<string | number | RecipeFuture>;
}

export type RecipeVertex =
  | HardhatContractRecipeVertex
  | ArtifactContractRecipeVertex
  | DeployedContractRecipeVertex
  | HardhatLibraryRecipeVertex
  | ArtifactLibraryRecipeVertex
  | CallRecipeVertex;

export interface ContractOptions {
  args?: Array<string | number | RecipeFuture>;
  libraries?: {
    [key: string]: RecipeFuture;
  };
}

export interface IRecipeGraph {
  vertexes: Map<number, RecipeVertex>;
  adjacencyList: Array<Set<number>>;

  vertexSize: () => number;
  addRecipeVertex: (node: RecipeVertex) => void;
  getRecipeVertexByLabel: (label: string) => RecipeVertex | undefined;
  getRecipeVertexById: (id: number) => RecipeVertex | undefined;
  getDependenciesForVertex: ({
    id,
  }: {
    id: number;
  }) => Array<{ id: number; label: string }>;
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
    contractFuture: HardhatContract | ArtifactContract | DeployedContract,
    functionName: string,
    {
      args,
    }: {
      args: Array<string | number | RecipeFuture>;
    }
  ) => ContractCall;

  getParam: (paramName: string) => RequiredParameter;

  getOptionalParam: (
    paramName: string,
    defaultValue: ParameterValue
  ) => OptionalParameter;
}

export interface Recipe {
  name: string;
  steps: (builder: IRecipeGraphBuilder) => FutureDict;
}

export interface RecipeGraphBuilderOptions {
  chainId: number;
}
