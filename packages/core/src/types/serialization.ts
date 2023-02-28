import type { ModuleDict } from "./module";

export interface ContractInfo {
  name: string;
  address: string;
  abi: any[];
}

export type SerializedDeploymentResult<T extends ModuleDict> = {
  [K in keyof T]: ContractInfo;
};
