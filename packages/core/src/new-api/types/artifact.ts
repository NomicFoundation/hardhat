import { Journal } from "./journal";

/**
 * An compilation artifact representing a smart contract.
 *
 * @beta
 */
export interface Artifact {
  contractName: string;
  bytecode: string;
  abi: any[];
  linkReferences: Record<
    string,
    Record<string, Array<{ length: number; start: number }>>
  >;
}

/**
 * Retrieve artifacts based on contract name.
 *
 * @beta
 */
export interface ArtifactResolver {
  load(contractName: string): Promise<Artifact>;
  resolvePath(contractName: string): Promise<string>;
}

/**
 * Read and write to the deployment storage.
 *
 * @beta
 */
export interface DeploymentLoader {
  journal: Journal;
  initialize(deploymentId: string): Promise<void>;
  recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void>;
}
