import {
  Artifact,
  DeploymentLoader,
  FileJournal,
  Journal,
  MemoryJournal,
} from "@ignored/ignition-core";
import fs from "fs-extra";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";
import { errorMonitor } from "stream";

class MemoryDeploymentLoader implements DeploymentLoader {
  public journal: Journal;

  private _deploymentId: string | null = null;
  private _deployedAddresses: { [key: string]: string };

  constructor(private _hre: HardhatRuntimeEnvironment) {
    this.journal = new MemoryJournal();
    this._deployedAddresses = {};
  }

  public async loadArtifact(storedArtifactPath: string): Promise<Artifact> {
    const json = await fs.readFile(storedArtifactPath);

    const artifact = JSON.parse(json.toString());

    return artifact;
  }

  public async initialize(deploymentId: string): Promise<void> {
    this._deploymentId = deploymentId;
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void> {
    this._deployedAddresses[futureId] = contractAddress;
  }

  public async storeArtifact(
    _futureId: string,
    artifact: Artifact
  ): Promise<string> {
    const artifactPaths = await this._hre.artifacts.getArtifactPaths();

    const artifactPath = artifactPaths.find(
      (p) => path.parse(p).name === artifact.contractName
    );

    if (artifactPath === undefined) {
      throw new Error(`Artifact path not found for ${artifact.contractName}`);
    }

    return artifactPath;
  }
}

class FileDeploymentLoader implements DeploymentLoader {
  public journal: Journal;

  private _paths: {
    deploymentDir: string;
    artifactsDir: string;
    journalPath: string;
    deployedAddressesPath: string;
  } | null = null;

  constructor(private readonly _hre: HardhatRuntimeEnvironment) {
    this.journal = new MemoryJournal();
  }

  public async initialize(deploymentId: string): Promise<void> {
    // TODO: validate the deployment id
    const deploymentDir = path.join(
      this._hre.config.paths.ignition,
      "deployments",
      deploymentId
    );
    const artifactsDir = path.join(deploymentDir, "artifacts");
    const journalPath = path.join(deploymentDir, "journal.jsonl");
    const deployedAddressesPath = path.join(
      deploymentDir,
      "deployed_addresses.json"
    );

    this._paths = {
      deploymentDir,
      artifactsDir,
      journalPath,
      deployedAddressesPath,
    };

    await fs.ensureDir(this._paths.deploymentDir);
    await fs.ensureDir(this._paths.artifactsDir);
    await fs.ensureFile(this._paths.journalPath);
    await fs.ensureFile(this._paths.deployedAddressesPath);

    this.journal = new FileJournal(journalPath);
  }

  public async storeArtifact(
    futureId: string,
    artifact: Artifact
  ): Promise<string> {
    if (this._paths === null) {
      throw new Error("Cannot record deploy address until initialized");
    }

    const artifactFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.json`
    );
    await fs.writeFile(
      artifactFilePath,
      JSON.stringify(artifact, undefined, 2)
    );

    return path.relative(this._paths.deploymentDir, artifactFilePath);
  }

  public async loadArtifact(storedArtifactPath: string): Promise<Artifact> {
    if (this._paths === null) {
      throw new Error("Cannot load artifact until initialized");
    }

    const json = await fs.readFile(
      path.join(this._paths?.deploymentDir, storedArtifactPath)
    );

    const artifact = JSON.parse(json.toString());

    return artifact;
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void> {
    if (this._paths === null) {
      throw new Error("Cannot record deploy address until initialized");
    }

    try {
      // TODO: should this be made async to be closer to a single fs transaction?
      const json = (
        await fs.readFile(this._paths.deployedAddressesPath)
      ).toString();

      const deployedAddresses: { [key: string]: string } = JSON.parse(
        json === "" ? "{}" : json
      );

      deployedAddresses[futureId] = contractAddress;

      await fs.writeFile(
        this._paths.deployedAddressesPath,
        `${JSON.stringify(deployedAddresses, undefined, 2)}\n`
      );
    } catch (error) {
      console.error(errorMonitor);
    }
  }
}

export function buildDeploymentLoader(
  hre: HardhatRuntimeEnvironment
): DeploymentLoader {
  return _isEphemeral(hre)
    ? new MemoryDeploymentLoader(hre)
    : new FileDeploymentLoader(hre);
}

/**
 * Determine whether to use a disk based deployment loader or memory based
 * deployment loader.
 *
 * The test is whether Hardhat reports the network name as hardhat which
 * is the network name in tests and if the `--network` flag is not set.
 * Running against a local node will not count as ephemeral.
 */
function _isEphemeral(hre: HardhatRuntimeEnvironment) {
  return hre.network.name === "hardhat";
}
