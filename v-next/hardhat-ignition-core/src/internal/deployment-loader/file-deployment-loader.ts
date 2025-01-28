import type { DeploymentLoader } from "./types.js";
import type { Artifact, BuildInfo } from "../../types/artifact.js";
import type { ExecutionEventListener } from "../../types/execution-events.js";
import type { JournalMessage } from "../execution/types/messages.js";
import type { Journal } from "../journal/types/index.js";

import path from "node:path";

import {
  ensureDir,
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import { FileJournal } from "../journal/file-journal.js";

interface DebugInfoFile {
  _format: "hh-sol-dbg-1";
  buildInfo: string;
}

export class FileDeploymentLoader implements DeploymentLoader {
  private readonly _journal: Journal;
  private _deploymentDirsEnsured: boolean;

  private readonly _paths: {
    deploymentDir: string;
    artifactsDir: string;
    buildInfoDir: string;
    journalPath: string;
    deployedAddressesPath: string;
  };

  constructor(
    private readonly _deploymentDirPath: string,
    private readonly _executionEventListener?:
      | ExecutionEventListener
      | undefined,
  ) {
    const artifactsDir = path.join(this._deploymentDirPath, "artifacts");
    const buildInfoDir = path.join(this._deploymentDirPath, "build-info");
    const journalPath = path.join(this._deploymentDirPath, "journal.jsonl");
    const deployedAddressesPath = path.join(
      this._deploymentDirPath,
      "deployed_addresses.json",
    );

    this._journal = new FileJournal(journalPath, this._executionEventListener);

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
    artifact: Artifact,
  ): Promise<void> {
    // For a file deployment we don't differentiate between
    // named contracts (from HH) and anonymous contracts passed in by the user
    return this.storeUserProvidedArtifact(futureId, artifact);
  }

  public async storeUserProvidedArtifact(
    futureId: string,
    artifact: Artifact,
  ): Promise<void> {
    await this._initialize();

    const artifactFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.json`,
    );

    await writeJsonFile(artifactFilePath, artifact);
  }

  public async storeBuildInfo(
    futureId: string,
    buildInfo: BuildInfo,
  ): Promise<void> {
    await this._initialize();

    const buildInfoFilePath = path.join(
      this._paths.buildInfoDir,
      `${buildInfo.id}.json`,
    );

    await writeJsonFile(buildInfoFilePath, buildInfo);

    const debugInfoFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.dbg.json`,
    );

    const relativeBuildInfoPath = path.relative(
      this._paths.artifactsDir,
      buildInfoFilePath,
    );

    const debugInfo: DebugInfoFile = {
      _format: "hh-sol-dbg-1",
      buildInfo: relativeBuildInfoPath,
    };

    await writeJsonFile(debugInfoFilePath, debugInfo);
  }

  public async readBuildInfo(futureId: string): Promise<BuildInfo> {
    await this._initialize();

    const debugInfoFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.dbg.json`,
    );

    const debugInfo = (await readJsonFile(debugInfoFilePath)) as DebugInfoFile;

    const buildInfoPath = path.resolve(
      this._paths.artifactsDir,
      debugInfo.buildInfo,
    );

    const buildInfo = (await readJsonFile(buildInfoPath)) as BuildInfo;

    return buildInfo;
  }

  public async loadArtifact(futureId: string): Promise<Artifact> {
    await this._initialize();

    const artifactFilePath = this._resolveArtifactPathFor(futureId);

    const artifact = (await readJsonFile(artifactFilePath)) as Artifact;

    return artifact;
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string,
  ): Promise<void> {
    await this._initialize();

    let deployedAddresses: { [key: string]: string };
    if (await exists(this._paths.deployedAddressesPath)) {
      deployedAddresses = await readJsonFile(this._paths.deployedAddressesPath);
    } else {
      deployedAddresses = {};
    }

    deployedAddresses[futureId] = contractAddress;

    await writeJsonFile(this._paths.deployedAddressesPath, deployedAddresses);
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
      `${futureId}.json`,
    );

    return artifactFilePath;
  }
}
