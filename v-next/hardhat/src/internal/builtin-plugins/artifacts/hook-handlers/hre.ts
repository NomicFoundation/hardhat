import type {
  ArtifactManager,
  GetArtifactByName,
} from "../../../../types/artifacts.js";
import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

class LazyArtifactManager implements ArtifactManager {
  readonly #artifactsPath: string;
  #artifactManager: ArtifactManager | undefined;

  constructor(artifactsPath: string) {
    this.#artifactManager = undefined;
    this.#artifactsPath = artifactsPath;
  }

  public async readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetArtifactByName<ContractNameT>> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.readArtifact(contractNameOrFullyQualifiedName);
  }

  public async getArtifactPath(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.getArtifactPath(contractNameOrFullyQualifiedName);
  }

  public async artifactExists(
    contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.artifactExists(contractNameOrFullyQualifiedName);
  }

  public async getAllFullyQualifiedNames(): Promise<ReadonlySet<string>> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.getAllFullyQualifiedNames();
  }

  public async getBuildInfoId(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string | undefined> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.getBuildInfoId(contractNameOrFullyQualifiedName);
  }

  public async getAllBuildInfoIds(): Promise<ReadonlySet<string>> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.getAllBuildInfoIds();
  }

  public async getBuildInfoPath(
    buildInfoId: string,
  ): Promise<string | undefined> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.getBuildInfoPath(buildInfoId);
  }

  public async getBuildInfoOutputPath(
    buildInfoId: string,
  ): Promise<string | undefined> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.getBuildInfoOutputPath(buildInfoId);
  }

  public async clearCache(): Promise<void> {
    const artifactManager = await this.#getArtifactManager();
    return artifactManager.clearCache();
  }

  async #getArtifactManager(): Promise<ArtifactManager> {
    if (this.#artifactManager === undefined) {
      const { ArtifactManagerImplementation } = await import(
        "../artifact-manager.js"
      );
      this.#artifactManager = new ArtifactManagerImplementation(
        this.#artifactsPath,
      );
    }

    return this.#artifactManager;
  }
}

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  const handlers: Partial<HardhatRuntimeEnvironmentHooks> = {
    created: async (_context, hre): Promise<void> => {
      hre.artifacts = new LazyArtifactManager(hre.config.paths.artifacts);
    },
  };

  return handlers;
};
