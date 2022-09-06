import { serializeFutureOutput } from "../utils/serialize";

export type SerializedRecipeResult = Record<string, SerializedFutureResult>;
export type SerializedDeploymentResult = Record<string, SerializedRecipeResult>;
export type SerializedFutureResult = ReturnType<typeof serializeFutureOutput>;

export type FutureOutput = string | number | Contract | Tx;

export interface Contract {
  name: string;
  address: string;
  abi: any[];
}

export interface Tx {
  hash: string;
}
