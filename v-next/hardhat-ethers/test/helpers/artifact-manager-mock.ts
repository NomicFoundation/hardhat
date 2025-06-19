import type {
  Artifact,
  ArtifactManager,
  GetArtifactByName,
} from "hardhat/types/artifacts";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

export class MockArtifactManager implements ArtifactManager {
  readonly #artifacts: Map<string, Artifact>;
  readonly #artifactsPaths: Map<string, string>;

  constructor(
    mockedArtifacts: Array<{ artifactName: string; fileName: string }>,
  ) {
    this.#artifacts = new Map();
    this.#artifactsPaths = new Map();

    // An array of elements, where every element has an artifact name and artifact file name, is passed as argument during initialization and stored in the map.
    // This ensures that, during testing, when an artifact is invoked, the mocked implementation can load the correct file associated with the artifact name.
    for (const { artifactName, fileName } of mockedArtifacts) {
      this.#artifactsPaths.set(artifactName, fileName);
    }
  }

  public async saveArtifact(artifact: Artifact): Promise<void> {
    this.#artifacts.set(artifact.contractName, artifact);
  }

  public async readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetArtifactByName<ContractNameT>> {
    const artifactFileName = this.#artifactsPaths.get(
      contractNameOrFullyQualifiedName,
    );

    if (artifactFileName === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
        {
          message: `Not implemented in MockArtifactManager - no mocked artifact found with name "${contractNameOrFullyQualifiedName}"`,
        },
      );
    }

    const artifact = (await import(`./artifacts/${artifactFileName}.ts`))
      .CONTRACT;

    return artifact;
  }

  public async getArtifactPath(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }

  public async artifactExists(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }

  public async getAllFullyQualifiedNames(): Promise<ReadonlySet<string>> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }

  public async getBuildInfoId(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<string | undefined> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }

  public async getAllBuildInfoIds(): Promise<ReadonlySet<string>> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }

  public async getBuildInfoPath(
    _buildInfoId: string,
  ): Promise<string | undefined> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }

  public async getBuildInfoOutputPath(
    _buildInfoId: string,
  ): Promise<string | undefined> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }

  public async clearCache(): Promise<void> {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.INTERNAL.NOT_IMPLEMENTED_ERROR,
      {
        message: "Not implemented in MockArtifactManager",
      },
    );
  }
}
