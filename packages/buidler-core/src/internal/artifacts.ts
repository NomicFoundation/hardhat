import fsExtra from "fs-extra";
import * as path from "path";

import { Artifact } from "../types";

import { BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { glob, globSync } from "./util/glob";

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
  let bytecode: string =
    evmBytecode && evmBytecode.object ? evmBytecode.object : "";

  if (bytecode.slice(0, 2).toLowerCase() !== "0x") {
    bytecode = `0x${bytecode}`;
  }

  const evmDeployedBytecode =
    contractOutput.evm && contractOutput.evm.deployedBytecode;
  let deployedBytecode: string =
    evmDeployedBytecode && evmDeployedBytecode.object
      ? evmDeployedBytecode.object
      : "";

  if (deployedBytecode.slice(0, 2).toLowerCase() !== "0x") {
    deployedBytecode = `0x${deployedBytecode}`;
  }

  const linkReferences =
    evmBytecode && evmBytecode.linkReferences ? evmBytecode.linkReferences : {};
  const deployedLinkReferences =
    evmDeployedBytecode && evmDeployedBytecode.linkReferences
      ? evmDeployedBytecode.linkReferences
      : {};

  return {
    contractName,
    abi: contractOutput.abi,
    bytecode,
    deployedBytecode,
    linkReferences,
    deployedLinkReferences,
  };
}

function getArtifactFromFiles(name: string, files: string[]): string {
  const matchingFiles = files.filter((file) => {
    const colonIndex = file.indexOf(":");
    if (colonIndex === -1) {
      throw new Error("should never happen"); // throw proper error
    }
    const contractName = file.slice(colonIndex + 1);
    return contractName === `${name}.json`;
  });
  if (matchingFiles.length === 0) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, { contractName: name });
  }
  if (matchingFiles.length > 1) {
    throw new BuidlerError(ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
      contractName: name,
    });
  }

  return matchingFiles[0];
}

function getArtifactPathFromFullyQualifiedName(
  artifactsPath: string,
  name: string
): string {
  const nameWithoutSol = name.replace(/\.sol/, "");
  return path.join(artifactsPath, `${nameWithoutSol}.json`);
}

async function getArtifactPath(
  artifactsPath: string,
  name: string
): Promise<string> {
  const isFullyQualified = name.includes(":");

  if (isFullyQualified) {
    return getArtifactPathFromFullyQualifiedName(artifactsPath, name);
  }

  const files = await glob(path.join(artifactsPath, "**/*.json"));
  return getArtifactFromFiles(name, files);
}

function getArtifactPathSync(artifactsPath: string, name: string): string {
  const isFullyQualified = name.includes(":");

  if (isFullyQualified) {
    return getArtifactPathFromFullyQualifiedName(artifactsPath, name);
  }

  const files = globSync(path.join(artifactsPath, "**/*.json"));
  return getArtifactFromFiles(name, files);
}

/**
 * Stores an artifact in the given path.
 *
 * @param artifactsPath the artifacts' directory.
 * @param globalName the global name of the file that emitted the artifact.
 * @param artifact the artifact to be stored.
 */
export async function saveArtifact(
  artifactsPath: string,
  globalName: string,
  artifact: Artifact
) {
  const fullyQualifiedName = `${globalName}:${artifact.contractName}`;
  const artifactPath = getArtifactPathFromFullyQualifiedName(
    artifactsPath,
    fullyQualifiedName
  );

  await fsExtra.ensureDir(path.dirname(artifactPath));

  await fsExtra.writeJSON(artifactPath, artifact, {
    spaces: 2,
  });
}

/**
 * Asynchronically reads an artifact with the given `contractName` from the given `artifactPath`.
 *
 * @param artifactsPath the artifacts' directory.
 * @param name          either the contract's name or the fully qualified name
 */
export async function readArtifact(
  artifactsPath: string,
  name: string
): Promise<Artifact> {
  const artifactPath = await getArtifactPath(artifactsPath, name);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, { contractName: name });
  }

  return fsExtra.readJson(artifactPath);
}

/**
 * Synchronically reads an artifact with the given `contractName` from the given `artifactPath`.
 *
 * @param artifactsPath the artifacts directory.
 * @param name          either the contract's name or the fully qualified name
 */
export function readArtifactSync(
  artifactsPath: string,
  name: string
): Artifact {
  const artifactPath = getArtifactPathSync(artifactsPath, name);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, { contractName: name });
  }

  return fsExtra.readJsonSync(artifactPath);
}
