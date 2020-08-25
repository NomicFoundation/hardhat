import {
  BuidlerDocker,
  DockerBadGatewayError,
  DockerHubConnectionError,
  DockerNotRunningError,
  DockerServerError,
  Image,
  ImageDoesntExistError,
  ProcessResult,
} from "@nomiclabs/buidler-docker";
import {
  NomicLabsBuidlerPluginError,
  saveArtifact,
} from "@nomiclabs/buidler/plugins";
import { ProjectPaths } from "@nomiclabs/buidler/types";
import fsExtra from "fs-extra";
import path from "path";

import { VyperConfig } from "./types";

const VYPER_DOCKER_REPOSITORY = "ethereum/vyper";
const LAST_VYPER_VERSION_USED_FILENAME = "last-vyper-version-used.txt";
const VYPER_DOCKER_IMAGES_LAST_UPDATE_CHECK_FILE = "vyper-docker-updates.json";
const CHECK_UPDATES_INTERVAL = 3600000;

export async function compile(vyperConfig: VyperConfig, paths: ProjectPaths) {
  const vyperVersion = vyperConfig.version;

  const dockerImage = {
    repository: VYPER_DOCKER_REPOSITORY,
    tag: vyperVersion,
  };

  await validateDockerIsInstalled();

  const docker = await handleCommonErrors(BuidlerDocker.create());

  await handleCommonErrors(
    pullImageIfNecessary(docker, dockerImage, paths.cache)
  );

  const files = await getVyperSources(paths);

  let someContractFailed = false;

  for (const file of files) {
    const pathFromCWD = path.relative(process.cwd(), file);
    const pathFromSources = path.relative(paths.sources, file);

    if (await isAlreadyCompiled(file, paths, vyperVersion, files)) {
      console.log(pathFromCWD, "is already compiled");
      continue;
    }

    console.log("Compiling", pathFromCWD);

    const processResult = await handleCommonErrors(
      compileWithDocker(file, docker, dockerImage, paths)
    );

    if (processResult.statusCode === 0) {
      const vyperOutput = JSON.parse(processResult.stdout.toString("utf8"))[
        pathFromSources
      ];

      const artifact = getArtifactFromVyperOutput(file, vyperOutput);

      await fsExtra.ensureDir(paths.artifacts);

      // TODO this might not work on windows, maybe we should use `slash` here
      const globalName = path.relative(paths.sources, file);

      // TODO-HH what should we do instead of this empty string?
      await saveArtifact(paths.artifacts, globalName, artifact, "");
    } else {
      console.error(processResult.stderr.toString("utf8").trim(), "\n");

      someContractFailed = true;
    }
  }

  if (someContractFailed) {
    throw new NomicLabsBuidlerPluginError(
      "@nomiclabs/buidler-vyper",
      "Compilation failed"
    );
  }

  await saveLastVyperVersionUsed(vyperVersion, paths);
}

async function isAlreadyCompiled(
  sourceFile: string,
  paths: ProjectPaths,
  vyperVersion: string,
  sources: string[]
) {
  const lastVyperVersionUsed = await getLastVyperVersionUsed(paths);
  if (lastVyperVersionUsed !== vyperVersion) {
    return false;
  }

  const contractName = pathToContractName(sourceFile);
  const artifactPath = path.join(paths.artifacts, `${contractName}.json`);
  if (!(await fsExtra.pathExists(artifactPath))) {
    return false;
  }

  const artifactCtime = (await fsExtra.stat(artifactPath)).ctimeMs;

  const stats = await Promise.all(sources.map((f) => fsExtra.stat(f)));

  const lastSourcesCtime = Math.max(...stats.map((s) => s.ctimeMs));

  return lastSourcesCtime < artifactCtime;
}

async function getVyperSources(paths: ProjectPaths) {
  const glob = await import("glob");
  const vyFiles = glob.sync(path.join(paths.sources, "**", "*.vy"));
  const vpyFiles = glob.sync(path.join(paths.sources, "**", "*.v.py"));

  return [...vyFiles, ...vpyFiles];
}

function pathToContractName(file: string) {
  const sourceName = path.basename(file);
  return sourceName.substring(0, sourceName.indexOf("."));
}

function getArtifactFromVyperOutput(sourceFile: string, output: any) {
  const contractName = pathToContractName(sourceFile);

  return {
    contractName,
    abi: output.abi,
    bytecode: add0xPrefixIfNecessary(output.bytecode),
    deployedBytecode: add0xPrefixIfNecessary(output.bytecode_runtime),
    linkReferences: {},
    deployedLinkReferences: {},
  };
}

function add0xPrefixIfNecessary(hex: string): string {
  hex = hex.toLowerCase();

  if (hex.slice(0, 2) === "0x") {
    return hex;
  }

  return `0x${hex}`;
}

async function getLastVyperVersionUsed(paths: ProjectPaths) {
  const filePath = path.join(paths.cache, LAST_VYPER_VERSION_USED_FILENAME);
  if (!(await fsExtra.pathExists(filePath))) {
    return undefined;
  }

  return fsExtra.readFile(filePath, "utf8");
}

async function saveLastVyperVersionUsed(version: string, paths: ProjectPaths) {
  const filePath = path.join(paths.cache, LAST_VYPER_VERSION_USED_FILENAME);
  await fsExtra.ensureDir(path.dirname(filePath));
  return fsExtra.writeFile(filePath, version, "utf8");
}

async function validateDockerIsInstalled() {
  if (!(await BuidlerDocker.isInstalled())) {
    throw new NomicLabsBuidlerPluginError(
      "@nomiclabs/buidler-vyper",
      `Docker Desktop is not installed.
Please install it by following the instructions on https://www.docker.com/get-started`
    );
  }
}

async function pullImageIfNecessary(
  docker: BuidlerDocker,
  image: Image,
  cachePath: string
) {
  if (!(await docker.hasPulledImage(image))) {
    console.log(
      `Pulling Docker image ${BuidlerDocker.imageToRepoTag(image)}...`
    );

    await docker.pullImage(image);

    console.log(`Image pulled`);
  } else {
    await checkForImageUpdates(docker, image, cachePath);
  }
}

async function checkForImageUpdates(
  docker: BuidlerDocker,
  image: Image,
  cachePath: string
) {
  if (!(await shouldCheckForUpdates(image, cachePath))) {
    return;
  }

  if (!(await docker.isImageUpToDate(image))) {
    console.log(
      `Updating Docker image ${BuidlerDocker.imageToRepoTag(image)}...`
    );

    await docker.pullImage(image);

    console.log(`Image updated`);
  }

  await saveLastUpdateCheckDate(image, cachePath);
}

async function shouldCheckForUpdates(image: Image, cachePath: string) {
  const lastDate = await getLastUpdateCheckDate(image, cachePath);
  if (lastDate === undefined) {
    return true;
  }

  return lastDate + CHECK_UPDATES_INTERVAL < +new Date();
}

async function getLastUpdateCheckDate(
  image: Image,
  cachePath: string
): Promise<number | undefined> {
  const file = path.join(cachePath, VYPER_DOCKER_IMAGES_LAST_UPDATE_CHECK_FILE);
  if (!(await fsExtra.pathExists(file))) {
    return undefined;
  }

  const updates = await fsExtra.readJSON(file);
  return updates[BuidlerDocker.imageToRepoTag(image)];
}

async function saveLastUpdateCheckDate(image: Image, cachePath: string) {
  let updates: { [repoTag: string]: number };

  const file = path.join(cachePath, VYPER_DOCKER_IMAGES_LAST_UPDATE_CHECK_FILE);
  if (!(await fsExtra.pathExists(file))) {
    updates = {};
  } else {
    updates = await fsExtra.readJSON(file);
  }

  updates[BuidlerDocker.imageToRepoTag(image)] = +new Date();

  await fsExtra.ensureDir(path.dirname(file));
  await fsExtra.writeJSON(file, updates);
}

async function compileWithDocker(
  filePath: string,
  docker: BuidlerDocker,
  dockerImage: Image,
  paths: ProjectPaths
): Promise<ProcessResult> {
  const pathFromSources = path.relative(paths.sources, filePath);

  return docker.runContainer(
    dockerImage,
    ["vyper", "-f", "combined_json", pathFromSources],
    {
      binds: {
        [paths.sources]: "/code",
      },
      workingDirectory: "/code",
    }
  );
}

async function handleCommonErrors<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (
      error instanceof DockerNotRunningError ||
      error instanceof DockerBadGatewayError
    ) {
      throw new NomicLabsBuidlerPluginError(
        "@nomiclabs/buidler-vyper",
        "Docker Desktop is not running.\nPlease open it and wait until it finishes booting.",
        error
      );
    }

    if (error instanceof DockerHubConnectionError) {
      throw new NomicLabsBuidlerPluginError(
        "@nomiclabs/buidler-vyper",
        `Error connecting to Docker Hub.
Please check your internet connection.`,
        error
      );
    }

    if (error instanceof DockerServerError) {
      throw new NomicLabsBuidlerPluginError(
        "@nomiclabs/buidler-vyper",
        "Docker error",
        error
      );
    }

    if (error instanceof ImageDoesntExistError) {
      throw new NomicLabsBuidlerPluginError(
        "@nomiclabs/buidler-vyper",
        `Docker image ${BuidlerDocker.imageToRepoTag(
          error.image
        )} doesn't exist.
Make sure you chose a valid Vyper version.`
      );
    }

    throw error;
  }
}
