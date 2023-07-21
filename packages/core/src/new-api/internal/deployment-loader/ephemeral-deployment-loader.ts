import { Artifact, ArtifactResolver, BuildInfo } from "../../types/artifact";
import { DeploymentLoader } from "../../types/deployment-loader";
import { Journal } from "../../types/journal";
import { MemoryJournal } from "../journal/memory-journal";
import { assertIgnitionInvariant } from "../utils/assertions";

/**
 * Stores and loads deployment related information without making changes
 * on disk, by either storing in memory or loading already existing files.
 * Used when running in environments like Hardhat tests.
 */
export class EphemeralDeploymentLoader implements DeploymentLoader {
  public journal: Journal;

  private _deployedAddresses: { [key: string]: string };
  private _savedArtifacts: {
    [key: string]:
      | { _kind: "artifact"; artifact: Artifact }
      | { _kind: "contractName"; contractName: string };
  };

  constructor(
    private _artifactResolver: ArtifactResolver,
    private _verbose: boolean
  ) {
    this.journal = new MemoryJournal(this._verbose);
    this._deployedAddresses = {};
    this._savedArtifacts = {};
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void> {
    this._deployedAddresses[futureId] = contractAddress;
  }

  public async storeBuildInfo(_buildInfo: BuildInfo): Promise<void> {
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

  public async loadArtifact(artifactFutureId: string): Promise<Artifact> {
    const futureId = artifactFutureId;

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
