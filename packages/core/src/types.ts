import { serializeFutureOutput } from "./utils";

export interface Artifact {
  contractName: string;
  bytecode: string;
  abi: any[];
  linkReferences: Record<
    string,
    Record<string, Array<{ length: number; start: number }>>
  >;
}

export interface Contract {
  name: string;
  address: string;
  abi: any[];
}

export interface DeployedContract extends Contract {
  bytecode: string;
}

export interface Tx {
  hash: string;
}

export interface IgnitionRecipesResults {
  load: (recipeId: string) => Promise<SerializedRecipeResult | undefined>;
  save: (
    recipeId: string,
    recipeResult: SerializedRecipeResult
  ) => Promise<void>;
}

export type DeploymentResult =
  | { _kind: "failure"; failures: [string, Error[]] }
  | { _kind: "hold"; holds: [string, string[]] }
  | { _kind: "success"; result: SerializedDeploymentResult };

export type SerializedRecipeResult = Record<string, SerializedFutureResult>;
export type SerializedDeploymentResult = Record<string, SerializedRecipeResult>;
export type SerializedFutureResult = ReturnType<typeof serializeFutureOutput>;

export type FutureOutput = string | number | Contract | Tx;
