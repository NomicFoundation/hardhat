import {
  ArtifactContractAtFuture,
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  NamedContractAtFuture,
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

export type UiContractAtFuture =
  | NamedContractAtFuture<string>
  | ArtifactContractAtFuture;

export type UiFuture = UiContractFuture | UiCallFuture | UiContractAtFuture;
