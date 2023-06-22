import fs from "fs-extra";
import path from "path";

import { Artifact, BuildInfo } from "../../types/artifact";
import { DeploymentLoader } from "../../types/deployment-loader";
import { Journal } from "../../types/journal";
import { FileJournal } from "../journal/file-journal";
import { MemoryJournal } from "../journal/memory-journal";

export class FileDeploymentLoader implements DeploymentLoader {
  public journal: Journal;

  private _paths: {
    deploymentDir: string;
    artifactsDir: string;
    buildInfoDir: string;
    journalPath: string;
    deployedAddressesPath: string;
  } | null = null;

  constructor(private readonly _deploymentDirPath: string) {
    this.journal = new MemoryJournal();
  }

  public async initialize(): Promise<void> {
    const artifactsDir = path.join(this._deploymentDirPath, "artifacts");
    const buildInfoDir = path.join(this._deploymentDirPath, "build-info");
    const journalPath = path.join(this._deploymentDirPath, "journal.jsonl");
    const deployedAddressesPath = path.join(
      this._deploymentDirPath,
      "deployed_addresses.json"
    );

    this._paths = {
      deploymentDir: this._deploymentDirPath,
      artifactsDir,
      buildInfoDir,
      journalPath,
      deployedAddressesPath,
    };

    await fs.ensureDir(this._paths.deploymentDir);
    await fs.ensureDir(this._paths.artifactsDir);
    await fs.ensureDir(this._paths.buildInfoDir);
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

  public async storeBuildInfo(buildInfo: BuildInfo): Promise<string> {
    if (this._paths === null) {
      throw new Error("Cannot record build info address until initialized");
    }

    const buildInfoFilePath = path.join(
      this._paths?.buildInfoDir,
      `${buildInfo.id}.json`
    );
    await fs.writeFile(
      buildInfoFilePath,
      JSON.stringify(buildInfo, undefined, 2)
    );

    return path.relative(this._paths.deploymentDir, buildInfoFilePath);
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
  }
}
