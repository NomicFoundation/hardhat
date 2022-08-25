export interface HardhatContract {
  id: number;
  label: string;
  type: "contract";
  subtype: "hardhat";
  _future: true;
}

export interface ArtifactContract {
  id: number;
  label: string;
  type: "contract";
  subtype: "artifact";
  _future: true;
}

export interface DeployedContract {
  id: number;
  label: string;
  type: "contract";
  subtype: "deployed";
  _future: true;
}

export interface HardhatLibrary {
  id: number;
  label: string;
  type: "library";
  subtype: "hardhat";
  _future: true;
}

export interface ArtifactLibrary {
  id: number;
  label: string;
  type: "library";
  subtype: "artifact";
  _future: true;
}

export interface ContractCall {
  id: number;
  label: string;
  type: "call";
  _future: true;
}

export type ParameterValue = string | number | RecipeFuture;

export interface RequiredParameter {
  id: number;
  label: string;
  type: "parameter";
  subtype: "required";
  scope: string;
  _future: true;
}

export interface OptionalParameter {
  id: number;
  label: string;
  type: "parameter";
  subtype: "optional";
  defaultValue: ParameterValue;
  scope: string;
  _future: true;
}

export type RecipeFuture =
  | HardhatContract
  | ArtifactContract
  | DeployedContract
  | HardhatLibrary
  | ArtifactLibrary
  | ContractCall
  | RequiredParameter
  | OptionalParameter;

export interface FutureDict {
  [key: string]: RecipeFuture;
}
