import * as path from "path";

import { Artifact } from "../types";

import { BuidlerError, ERRORS } from "./core/errors";

export function getArtifactFromContractOutput(
  contractName: string,
  contractOutput: any
): Artifact {
  const evmBytecode = contractOutput.evm && contractOutput.evm.bytecode;

  const bytecode: string = evmBytecode ? evmBytecode.object : "";
  const linkReferences = evmBytecode ? evmBytecode.linkReferences : {};

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

export async function saveArtifact(artifactsPath: string, artifact: Artifact) {
  const fsExtra = await import("fs-extra");
  await fsExtra.writeJSON(
    artifactsPath + "/" + artifact.contractName + ".json",
    artifact,
    {
      spaces: 2
    }
  );
}

export async function readArtifact(
  artifactsPath: string,
  contractName: string
): Promise<Artifact> {
  const fsExtra = require("fs-extra");
  const artifactPath = getArtifactPath(artifactsPath, contractName);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, contractName);
  }

  return fsExtra.readJson(artifactPath);
}

export function readArtifactSync(
  artifactsPath: string,
  contractName: string
): Artifact {
  const fsExtra = require("fs-extra");
  const artifactPath = getArtifactPath(artifactsPath, contractName);

  if (!fsExtra.pathExistsSync(artifactPath)) {
    throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, contractName);
  }

  return fsExtra.readJsonSync(artifactPath);
}
