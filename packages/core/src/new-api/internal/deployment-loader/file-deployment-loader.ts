import { ensureDir, pathExists, readFile, writeFile } from "fs-extra";
import path from "path";

import { Artifact, BuildInfo } from "../../types/artifact";
import {
  ExecutionEventListener,
  ExecutionEventType,
} from "../../types/execution-events";
import { FileJournal } from "../journal/file-journal";
import { Journal } from "../journal/types";
import { JournalMessage } from "../new-execution/types/messages";

import { DeploymentLoader } from "./types";

export class FileDeploymentLoader implements DeploymentLoader {
  private _journal: Journal;
  private _deploymentDirsEnsured: boolean;

  private _paths: {
    deploymentDir: string;
    artifactsDir: string;
    buildInfoDir: string;
    journalPath: string;
    deployedAddressesPath: string;
  };

  constructor(
    private readonly _deploymentDirPath: string,
    private readonly _verbose: boolean,
    private readonly _executionEventListener?: ExecutionEventListener
  ) {
    const artifactsDir = path.join(this._deploymentDirPath, "artifacts");
    const buildInfoDir = path.join(this._deploymentDirPath, "build-info");
    const journalPath = path.join(this._deploymentDirPath, "journal.jsonl");
    const deployedAddressesPath = path.join(
      this._deploymentDirPath,
      "deployed_addresses.json"
    );

    this._journal = new FileJournal(
      journalPath,
      this._verbose,
      this._executionEventListener
    );

    this._paths = {
      deploymentDir: this._deploymentDirPath,
      artifactsDir,
      buildInfoDir,
      journalPath,
      deployedAddressesPath,
    };

    this._deploymentDirsEnsured = false;
  }

  public async recordToJournal(message: JournalMessage): Promise<void> {
    await this._initialize();

    // NOTE: the journal record is sync, even though this call is async
    this._journal.record(message);
  }

  public readFromJournal(): AsyncGenerator<JournalMessage, any, unknown> {
    return this._journal.read();
  }

  public storeNamedArtifact(
    futureId: string,
    _contractName: string,
    artifact: Artifact
  ): Promise<void> {
    // For a file deployment we don't differentiate between
    // named contracts (from HH) and anonymous contracts passed in by the user
    return this.storeUserProvidedArtifact(futureId, artifact);
  }

  public async storeUserProvidedArtifact(
    futureId: string,
    artifact: Artifact
  ): Promise<void> {
    await this._initialize();

    const artifactFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.json`
    );

    await writeFile(artifactFilePath, JSON.stringify(artifact, undefined, 2));
  }

  public async storeBuildInfo(buildInfo: BuildInfo): Promise<void> {
    await this._initialize();

    const buildInfoFilePath = path.join(
      this._paths.buildInfoDir,
      `${buildInfo.id}.json`
    );

    await writeFile(buildInfoFilePath, JSON.stringify(buildInfo, undefined, 2));
  }

  public async loadArtifact(futureId: string): Promise<Artifact> {
    await this._initialize();

    const artifactFilePath = this._resolveArtifactPathFor(futureId);

    const json = await readFile(artifactFilePath);

    const artifact = JSON.parse(json.toString());

    return artifact;
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void> {
    await this._initialize();

    let deployedAddresses: { [key: string]: string };
    if (await pathExists(this._paths.deployedAddressesPath)) {
      const json = (
        await readFile(this._paths.deployedAddressesPath)
      ).toString();

      deployedAddresses = JSON.parse(json);
    } else {
      deployedAddresses = {};
    }

    deployedAddresses[futureId] = contractAddress;

    await writeFile(
      this._paths.deployedAddressesPath,
      `${JSON.stringify(deployedAddresses, undefined, 2)}\n`
    );
  }

  public emitDeploymentBatchEvent(batches: string[][]): void {
    if (this._executionEventListener !== undefined) {
      this._executionEventListener.BATCH_INITIALIZE({
        type: ExecutionEventType.BATCH_INITIALIZE,
        batches,
      });
    }
  }

  private async _initialize(): Promise<void> {
    if (this._deploymentDirsEnsured) {
      return;
    }

    await ensureDir(this._paths.deploymentDir);
    await ensureDir(this._paths.artifactsDir);
    await ensureDir(this._paths.buildInfoDir);

    this._deploymentDirsEnsured = true;
  }

  private _resolveArtifactPathFor(futureId: string) {
    const artifactFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.json`
    );

    return artifactFilePath;
  }
}
