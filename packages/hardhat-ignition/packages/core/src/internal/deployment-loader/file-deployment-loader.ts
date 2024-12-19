import { ensureDir, pathExists, readFile, writeFile } from "fs-extra";
import path from "path";

import { Artifact, BuildInfo } from "../../types/artifact";
import { ExecutionEventListener } from "../../types/execution-events";
import { JournalMessage } from "../execution/types/messages";
import { FileJournal } from "../journal/file-journal";
import { Journal } from "../journal/types";

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
    private readonly _executionEventListener?: ExecutionEventListener
  ) {
    const artifactsDir = path.join(this._deploymentDirPath, "artifacts");
    const buildInfoDir = path.join(this._deploymentDirPath, "build-info");
    const journalPath = path.join(this._deploymentDirPath, "journal.jsonl");
    const deployedAddressesPath = path.join(
      this._deploymentDirPath,
      "deployed_addresses.json"
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

  public async storeBuildInfo(
    futureId: string,
    buildInfo: BuildInfo
  ): Promise<void> {
    await this._initialize();

    const buildInfoFilePath = path.join(
      this._paths.buildInfoDir,
      `${buildInfo.id}.json`
    );

    await writeFile(buildInfoFilePath, JSON.stringify(buildInfo, undefined, 2));

    const debugInfoFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.dbg.json`
    );

    const relativeBuildInfoPath = path.relative(
      this._paths.artifactsDir,
      buildInfoFilePath
    );

    await writeFile(
      debugInfoFilePath,
      JSON.stringify(
        {
          _format: "hh-sol-dbg-1",
          buildInfo: relativeBuildInfoPath,
        },
        undefined,
        2
      )
    );
  }

  public async readBuildInfo(futureId: string): Promise<BuildInfo> {
    await this._initialize();

    const debugInfoFilePath = path.join(
      this._paths.artifactsDir,
      `${futureId}.dbg.json`
    );

    const json = JSON.parse((await readFile(debugInfoFilePath)).toString());

    const buildInfoPath = path.resolve(
      this._paths.artifactsDir,
      json.buildInfo
    );

    const buildInfo = JSON.parse((await readFile(buildInfoPath)).toString());

    return buildInfo;
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
