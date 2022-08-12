import {
  ArtifactContract,
  ArtifactLibrary,
  ContractCall,
  DeployedContract,
  Future,
  FutureDict,
  HardhatContract,
  HardhatLibrary,
  OptionalParameter,
  ParameterValue,
  RequiredParameter,
} from "./future";
import { VertexDescriptor } from "./graph";
import { Artifact } from "./hardhat";

interface LibraryMap {
  [key: string]: Future;
}

export interface HardhatContractRecipeVertex {
  id: number;
  type: "HardhatContract";
  label: string;
  args: Array<string | number | Future>;
  libraries: LibraryMap;
}

export interface ArtifactContractRecipeVertex {
  id: number;
  type: "ArtifactContract";
  label: string;
  args: Array<string | number | Future>;
  libraries: LibraryMap;
}

export interface DeployedContractRecipeVertex {
  id: number;
  type: "DeployedContract";
  label: string;
  bytecode: string;
  abi: any[];
}

export interface HardhatLibraryRecipeVertex {
  id: number;
  type: "HardhatLibrary";
  label: string;
  args: Array<string | number | Future>;
}

export interface ArtifactLibraryRecipeVertex {
  id: number;
  type: "ArtifactLibrary";
  label: string;
  args: Array<string | number | Future>;
}

export interface CallRecipeVertex {
  id: number;
  type: "Call";
  label: string;
  contract: number;
  args: Array<string | number | Future>;
}

export type RecipeVertex =
  | HardhatContractRecipeVertex
  | ArtifactContractRecipeVertex
  | DeployedContractRecipeVertex
  | HardhatLibraryRecipeVertex
  | ArtifactLibraryRecipeVertex
  | CallRecipeVertex;

export interface ContractOptions {
  args?: Array<string | number | Future>;
  libraries?: {
    [key: string]: Future;
  };
}

export interface IRecipeGraph {
  nodes: Map<number, VertexDescriptor>;
  edges: Array<{ from: number; to: number }>;

  size: () => number;
  addDepNode: (node: RecipeVertex) => void;
  getDepNodeByLabel: (label: string) => RecipeVertex | undefined;
  getDepNodeById: (id: number) => RecipeVertex | undefined;
  getDependenciesFor: ({
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
    bytecode: string,
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
      args: Array<string | number | Future>;
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
