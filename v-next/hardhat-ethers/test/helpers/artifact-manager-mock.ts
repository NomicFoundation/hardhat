import type {
  Artifact,
  ArtifactsManager,
  BuildInfo,
  GetAtifactByName,
} from "@ignored/hardhat-vnext/types/artifacts";
import type {
  CompilerInput,
  CompilerOutput,
} from "@ignored/hardhat-vnext/types/solidity";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

export class MockArtifactsManager implements ArtifactsManager {
  readonly #artifacts: Map<string, Artifact>;
  readonly #artifactsPaths: Map<string, string>;

  constructor(
    mockedArtifacts?: Array<{ artifactName: string; fileName: string }>,
  ) {
    this.#artifacts = new Map();
    this.#artifactsPaths = new Map();

    // An array of elements, where every element has an artifact name and artifact file name, is passed as argument during initialization and stored in the map.
    // This ensures that, during testing, when an artifact is invoked, the mocked implementation can load the correct file associated with the artifact name.
    if (mockedArtifacts !== undefined) {
      for (const { artifactName, fileName } of mockedArtifacts) {
        this.#artifactsPaths.set(artifactName, fileName);
      }
    }
  }

  public async readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetAtifactByName<ContractNameT>> {
    const artifactFileName = this.#artifactsPaths.get(
      contractNameOrFullyQualifiedName,
    );

    if (artifactFileName === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR,
        {
          message: `Not implemented in MockArtifactsManager - no mocked artifact found with name "${contractNameOrFullyQualifiedName}"`,
        },
      );
    }

    const artifact = (await import(`./artifacts/${artifactFileName}.ts`))
      .CONTRACT;

    return artifact;
  }

  public artifactExists(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getAllFullyQualifiedNames(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getBuildInfo(
    _fullyQualifiedName: string,
  ): Promise<BuildInfo | undefined> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getArtifactPaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getDebugFilePaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getBuildInfoPaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public async saveArtifact(artifact: Artifact): Promise<void> {
    this.#artifacts.set(artifact.contractName, artifact);
  }

  public saveBuildInfo(
    _solcVersion: string,
    _solcLongVersion: string,
    _input: CompilerInput,
    _output: CompilerOutput,
  ): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public formArtifactPathFromFullyQualifiedName(
    _fullyQualifiedName: string,
  ): string {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getArtifactPath(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }
}
