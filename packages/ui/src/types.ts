import {
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  ContractAtFuture,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
} from "@ignored/ignition-core/ui-helpers";

export type UiContractFuture =
  | NamedContractDeploymentFuture<string>
  | ArtifactContractDeploymentFuture
  | NamedLibraryDeploymentFuture<string>
  | ArtifactLibraryDeploymentFuture;

export type UiCallFuture =
  | NamedContractCallFuture<string, string>
  | NamedStaticCallFuture<string, string>;

export type UiFuture = UiContractFuture | UiCallFuture | ContractAtFuture;
