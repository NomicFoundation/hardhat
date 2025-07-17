import type {
  Artifact,
  BuildInfo,
  CompilerOutput,
} from "@nomicfoundation/ignition-core";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  exists,
  readdir,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

interface MigrateArguments {
  deploymentId: string;
}

const taskMigrate: NewTaskActionFunction<MigrateArguments> = async (
  { deploymentId },
  hre: HardhatRuntimeEnvironment,
) => {
  const deploymentDir = path.join(
    hre.config.paths.ignition,
    "deployments",
    deploymentId,
  );

  if (!(await exists(deploymentDir))) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.TRACK_TRANSACTIONS.DEPLOYMENT_DIR_NOT_FOUND,
      {
        deploymentDir,
      },
    );
  }

  const artifactsDir = `${deploymentDir}/artifacts`;

  for (const filename of await readdir(artifactsDir)) {
    if (filename.endsWith(".dbg.json")) {
      continue;
    }

    const artifactPath = path.join(artifactsDir, filename);
    const artifact: Artifact = await readJsonFile(artifactPath);

    const debugFilePath = path.join(
      artifactsDir,
      `${filename.split(".json")[0]}.dbg.json`,
    );
    const debugFile: { buildInfo: string } = await readJsonFile(debugFilePath);

    const buildInfoPath = path.resolve(artifactsDir, debugFile.buildInfo);

    const { output, ...buildInfo }: BuildInfo & { output: CompilerOutput } =
      await readJsonFile(buildInfoPath);

    if (artifact._format === "hh-sol-artifact-1") {
      const newArtifact: Artifact = {
        ...artifact,
        _format: "hh3-artifact-1",
        immutableReferences:
          output.contracts[artifact.sourceName][artifact.contractName].evm
            .deployedBytecode.immutableReferences ?? {},
        inputSourceName: artifact.sourceName,
        buildInfoId: buildInfo.id,
      };

      await writeJsonFile(artifactPath, newArtifact);
      await remove(debugFilePath);
    }

    if (buildInfo._format === "hh-sol-build-info-1") {
      const userSourceNameMap: Record<string, string> = {};
      for (const key of Object.keys(buildInfo.input.sources)) {
        userSourceNameMap[key] = key;
      }

      const newBuildInfo: BuildInfo = {
        ...buildInfo,
        userSourceNameMap,
        _format: "hh3-sol-build-info-1",
      };

      await writeJsonFile(buildInfoPath, newBuildInfo);
    }
  }
};

export default taskMigrate;
