import { Artifact, ArtifactResolver, BuildInfo } from "../../types/artifact";
import { ExecutionEventListener } from "../../types/execution-events";
import { JournalMessage } from "../execution/types/messages";
import { MemoryJournal } from "../journal/memory-journal";
import { Journal } from "../journal/types";
import { assertIgnitionInvariant } from "../utils/assertions";

import { DeploymentLoader } from "./types";

/**
 * Stores and loads deployment related information without making changes
 * on disk, by either storing in memory or loading already existing files.
 * Used when running in environments like Hardhat tests.
 */
export class EphemeralDeploymentLoader implements DeploymentLoader {
  private _journal: Journal;

  private _deployedAddresses: { [key: string]: string };
  private _savedArtifacts: {
    [key: string]:
      | { _kind: "artifact"; artifact: Artifact }
      | { _kind: "contractName"; contractName: string };
  };

  constructor(
    private _artifactResolver: ArtifactResolver,
    private _executionEventListener?: ExecutionEventListener
  ) {
    this._journal = new MemoryJournal(this._executionEventListener);
    this._deployedAddresses = {};
    this._savedArtifacts = {};
  }

  public async recordToJournal(message: JournalMessage): Promise<void> {
    this._journal.record(message);
  }

  public readFromJournal(): AsyncGenerator<JournalMessage, any, unknown> {
    return this._journal.read();
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void> {
    this._deployedAddresses[futureId] = contractAddress;
  }

  public async storeBuildInfo(
    _futureId: string,
    _buildInfo: BuildInfo
  ): Promise<void> {
    // For ephemeral we are ignoring build info
  }

  public async storeNamedArtifact(
    futureId: string,
    contractName: string,
    _artifact: Artifact
  ): Promise<void> {
    this._savedArtifacts[futureId] = { _kind: "contractName", contractName };
  }

  public async storeUserProvidedArtifact(
    futureId: string,
    artifact: Artifact
  ): Promise<void> {
    this._savedArtifacts[futureId] = { _kind: "artifact", artifact };
  }

  public async loadArtifact(artifactId: string): Promise<Artifact> {
    const futureId = artifactId;

    const saved = this._savedArtifacts[futureId];

    assertIgnitionInvariant(
      saved !== undefined,
      `No stored artifact for ${futureId}`
    );

    switch (saved._kind) {
      case "artifact": {
        return saved.artifact;
      }
      case "contractName": {
        const fileArtifact = this._artifactResolver.loadArtifact(
          saved.contractName
        );

        assertIgnitionInvariant(
          fileArtifact !== undefined,
          `Unable to load artifact, underlying resolver returned undefined for ${saved.contractName}`
        );

        return fileArtifact;
      }
    }
  }
}
