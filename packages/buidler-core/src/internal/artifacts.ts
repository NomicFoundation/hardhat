import fsExtra from "fs-extra";
import * as path from "path";

import { Artifact } from "../types";

import { BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";

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

function getArtifactPath(
  artifactsPath: string,
  globalName: string,
  contractName: string
): string {
  const filenameWithoutSol = path.basename(globalName).replace(".sol", "");
  return path.join(
    artifactsPath,
    path.dirname(globalName),
    `${filenameWithoutSol}:${contractName}.json`
  );
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
  await fsExtra.ensureDir(artifactsPath);
  const filenameWithoutSol = path.basename(globalName).replace(/\.sol$/, "");
  await fsExtra.writeJSON(
    path.join(
      artifactsPath,
      `${filenameWithoutSol}:${artifact.contractName}.json`
    ),
    artifact,
    {
      spaces: 2,
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
  globalName: string,
  contractName: string
): Promise<Artifact> {
  const artifactPath = getArtifactPath(artifactsPath, globalName, contractName);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, { contractName });
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
  globalName: string,
  contractName: string
): Artifact {
  const artifactPath = getArtifactPath(artifactsPath, globalName, contractName);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, { contractName });
  }

  return fsExtra.readJsonSync(artifactPath);
}
