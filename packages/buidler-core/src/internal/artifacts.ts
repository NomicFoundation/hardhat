import debug from "debug";
import fsExtra from "fs-extra";
import * as os from "os";
import * as path from "path";

import type { SolidityFilesCache } from "../builtin-tasks/utils/solidity-files-cache";
import { Artifact, SolcInput } from "../types";

import { BUILD_INFO_DIR_NAME } from "./constants";
import { BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { glob, globSync } from "./util/glob";

const ARTIFACTS_VERSION = 1;

const log = debug("buidler:core:artifacts");

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

function getFullyQualifiedName(
  artifactsPath: string,
  absolutePath: string
): string {
  return path
    .relative(artifactsPath, absolutePath)
    .replace(".json", "")
    .replace(":", ".sol:");
}

function getArtifactPathFromFiles(
  artifactsPath: string,
  name: string,
  files: string[]
): string {
  const matchingFiles = files.filter((file) => {
    const colonIndex = file.indexOf(":");
    if (colonIndex === -1) {
      // TODO throw a proper BuidlerError
      // tslint:disable only-buidler-error
      throw new Error("should never happen");
    }
    const contractName = file.slice(colonIndex + 1);
    return contractName === `${name}.json`;
  });

  if (matchingFiles.length === 0) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, { contractName: name });
  }

  if (matchingFiles.length > 1) {
    const candidates = matchingFiles
      .map((file) => getFullyQualifiedName(artifactsPath, file))
      .map(path.normalize);

    throw new BuidlerError(ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
      contractName: name,
      candidates: candidates.join(os.EOL),
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

function isFullyQualified(name: string) {
  return name.includes(":");
}

/**
 * Return a list with the absolute paths of all the existing artifacts.
 */
export async function getAllArtifacts(
  artifactsPath: string
): Promise<string[]> {
  const buildInfosGlob = path.join(
    artifactsPath,
    BUILD_INFO_DIR_NAME,
    "**/*.json"
  );

  const dbgsGlob = path.join(artifactsPath, "**/*.dbg.json");

  const artifactFiles = await glob(path.join(artifactsPath, "**/*.json"), {
    ignore: [buildInfosGlob, dbgsGlob],
  });

  return artifactFiles;
}

function getAllDbgFiles(artifactsPath: string): Promise<string[]> {
  return glob(path.join(artifactsPath, "**/*.dbg.json"));
}

function getAllArtifactsSync(artifactsPath: string): string[] {
  const artifactFiles = globSync(path.join(artifactsPath, "**/*.json"));
  const buildInfoFiles = new Set(getBuildInfoFilesSync(artifactsPath));

  return artifactFiles.filter((file) => !buildInfoFiles.has(file));
}

async function getArtifactPath(
  artifactsPath: string,
  name: string
): Promise<string> {
  if (isFullyQualified(name)) {
    return getArtifactPathFromFullyQualifiedName(artifactsPath, name);
  }

  const files = await getAllArtifacts(artifactsPath);
  return getArtifactPathFromFiles(artifactsPath, name, files);
}

export function getArtifactPathSync(
  artifactsPath: string,
  globalName: string,
  contractName?: string
): string {
  if (contractName === undefined) {
    if (isFullyQualified(globalName)) {
      return getArtifactPathFromFullyQualifiedName(artifactsPath, globalName);
    }

    const files = getAllArtifactsSync(artifactsPath);
    return getArtifactPathFromFiles(artifactsPath, globalName, files);
  }

  const fullyQualifiedName = `${globalName}:${contractName}`;
  const artifactPath = getArtifactPathFromFullyQualifiedName(
    artifactsPath,
    fullyQualifiedName
  );

  return artifactPath;
}

/**
 * Stores an artifact in the given path.
 *
 * @param artifactsPath the artifacts' directory.
 * @param globalName the global name of the file that emitted the artifact.
 * @param artifact the artifact to be stored.
 * @param pathToBuildInfo the relative path to the buildInfo for this artifact
 */
export async function saveArtifact(
  artifactsPath: string,
  globalName: string,
  artifact: Artifact,
  pathToBuildInfo: string
) {
  // artifact
  const fullyQualifiedName = `${globalName}:${artifact.contractName}`;
  const artifactPath = getArtifactPathFromFullyQualifiedName(
    artifactsPath,
    fullyQualifiedName
  );

  await fsExtra.ensureDir(path.dirname(artifactPath));

  // dbg
  const relativePathToBuildInfo = path.relative(
    path.dirname(artifactPath),
    pathToBuildInfo
  );
  const dbgPath = artifactPath.replace(/\.json$/, ".dbg.json");

  // write artifact and dbg
  await fsExtra.writeJSON(artifactPath, artifact, {
    spaces: 2,
  });
  await fsExtra.writeJSON(
    dbgPath,
    { version: ARTIFACTS_VERSION, buildInfo: relativePathToBuildInfo },
    {
      spaces: 2,
    }
  );
}

export async function saveBuildInfo(
  artifactsPath: string,
  input: SolcInput,
  output: any,
  solcVersion: string
): Promise<string> {
  const { sha256 } = await import("ethereum-cryptography/sha256");

  const buildInfoDir = path.join(artifactsPath, BUILD_INFO_DIR_NAME);
  await fsExtra.ensureDir(buildInfoDir);

  const hash = sha256(
    Buffer.from(JSON.stringify({ input, solcVersion }))
  ).toString("hex");
  const buildInfoPath = path.join(buildInfoDir, `${hash}.json`);
  await fsExtra.writeJson(buildInfoPath, {
    version: ARTIFACTS_VERSION,
    input,
    output,
    solcVersion,
  });

  return buildInfoPath;
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
    throw new BuidlerError(ERRORS.INTERNAL.WRONG_ARTIFACT_PATH, {
      contractName: name,
      artifactPath,
    });
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
    throw new BuidlerError(ERRORS.INTERNAL.WRONG_ARTIFACT_PATH, {
      contractName: name,
      artifactPath,
    });
  }

  return fsExtra.readJsonSync(artifactPath);
}

export async function getBuildInfoFiles(
  artifactsPath: string
): Promise<string[]> {
  return glob(path.join(artifactsPath, BUILD_INFO_DIR_NAME, "**/*.json"));
}

export function getBuildInfoFilesSync(artifactsPath: string): string[] {
  return globSync(path.join(artifactsPath, BUILD_INFO_DIR_NAME, "**/*.json"));
}

/**
 * Remove all artifacts that don't correspond to the current solidity files
 */
export async function removeObsoleteArtifacts(
  artifactsPath: string,
  solidityFilesCache: SolidityFilesCache
) {
  const validArtifacts = new Set<string>();
  for (const { globalName, artifacts } of Object.values(solidityFilesCache)) {
    for (const artifact of artifacts) {
      validArtifacts.add(
        getArtifactPathSync(artifactsPath, globalName, artifact)
      );
    }
  }

  const existingArtifacts = await getAllArtifacts(artifactsPath);

  for (const artifact of existingArtifacts) {
    if (!validArtifacts.has(artifact)) {
      // TODO-HH: consider moving all unlinks to a helper library that checks
      // that removed files are inside the project
      log(`Removing obsolete artifact '${artifact}'`);
      fsExtra.unlinkSync(artifact);
      const dbgFile = artifact.replace(/\.json$/, ".dbg.json");
      // we use remove instead of unlink in case the dbg file doesn't exist
      fsExtra.removeSync(dbgFile);
    }
  }
}

/**
 * Remove all build infos that aren't used by any dbg file
 */
export async function removeObsoleteBuildInfos(artifactsPath: string) {
  const dbgFiles = await getAllDbgFiles(artifactsPath);

  const validBuildInfos = new Set<string>();
  for (const dbgFile of dbgFiles) {
    const { buildInfo } = await fsExtra.readJson(dbgFile);
    validBuildInfos.add(path.resolve(path.dirname(dbgFile), buildInfo));
  }

  const buildInfoFiles = await getBuildInfoFiles(artifactsPath);

  for (const buildInfoFile of buildInfoFiles) {
    if (!validBuildInfos.has(buildInfoFile)) {
      log(`Removing buildInfo '${buildInfoFile}'`);
      await fsExtra.unlink(buildInfoFile);
    }
  }
}
