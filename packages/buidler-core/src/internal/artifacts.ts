import fsExtra from "fs-extra";
import * as path from "path";

import { Artifact } from "../types";

import { BuidlerError, ERRORS } from "./core/errors";

/**
 * Retrieves an artifact for the given `contractName` from the compilation output.
 *
 * @param contractName the contract's name.
 * @param contractOutput the contract's compilation output as emitted by `solc`.
 */
export function getArtifactFromContractOutput(
  contractName: string,
  contractOutput: any
): Artifact {
  const evmBytecode = contractOutput.evm && contractOutput.evm.bytecode;

  const bytecode: string =
    evmBytecode && evmBytecode.object ? evmBytecode.object : "";

  const linkReferences =
    evmBytecode && evmBytecode.linkReferences ? evmBytecode.linkReferences : {};

  return {
    contractName,
    abi: contractOutput.abi,
    bytecode,
    linkReferences
  };
}

function getArtifactPath(artifactsPath: string, contractName: string): string {
  return path.join(artifactsPath, `${contractName}.json`);
}

/**
 * Stores an artifact in the given path.
 *
 * @param artifactsPath the artifacts' directory.
 * @param artifact the artifact to be stored.
 */
export async function saveArtifact(artifactsPath: string, artifact: Artifact) {
  await fsExtra.writeJSON(
    artifactsPath + "/" + artifact.contractName + ".json",
    artifact,
    {
      spaces: 2
    }
  );
}

/**
 * Asynchronically reads an artifact with the given `contractName` from the given `artifactPath`.
 *
 * @param artifactsPath the artifacts' directory.
 * @param contractName  the contract's name.
 */
export async function readArtifact(
  artifactsPath: string,
  contractName: string
): Promise<Artifact> {
  const artifactPath = getArtifactPath(artifactsPath, contractName);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, contractName);
  }

  return fsExtra.readJson(artifactPath);
}

/**
 * Synchronically reads an artifact with the given `contractName` from the given `artifactPath`.
 *
 * @param artifactsPath the artifacts directory.
 * @param contractName  the contract's name.
 */
export function readArtifactSync(
  artifactsPath: string,
  contractName: string
): Artifact {
  const artifactPath = getArtifactPath(artifactsPath, contractName);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, contractName);
  }

  return fsExtra.readJsonSync(artifactPath);
}
