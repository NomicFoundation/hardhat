import type {
  ArtifactsManager,
  GetAtifactByName,
} from "../../../../types/artifacts.js";
import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

class LazyArtifactsManager implements ArtifactsManager {
  readonly #artifactsPath: string;
  #artifactsManager: ArtifactsManager | undefined;

  constructor(artifactsPath: string) {
    this.#artifactsManager = undefined;
    this.#artifactsPath = artifactsPath;
  }

  public async readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetAtifactByName<ContractNameT>> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.readArtifact(contractNameOrFullyQualifiedName);
  }

  public async getArtifactPath(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getArtifactPath(contractNameOrFullyQualifiedName);
  }

  public async artifactExists(
    contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.artifactExists(contractNameOrFullyQualifiedName);
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getAllFullyQualifiedNames();
  }

  public async getBuildInfoId(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string | undefined> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getBuildInfoId(contractNameOrFullyQualifiedName);
  }

  public async getAllBuildInfoIds(): Promise<string[]> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getAllBuildInfoIds();
  }

  public async getBuildInfoPath(
    buildInfoId: string,
  ): Promise<string | undefined> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getBuildInfoPath(buildInfoId);
  }

  public async getBuildInfoOutputPath(
    buildInfoId: string,
  ): Promise<string | undefined> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getBuildInfoOutputPath(buildInfoId);
  }

  async #getArtifactsManager(): Promise<ArtifactsManager> {
    if (this.#artifactsManager === undefined) {
      const { ArticlesManagerImplementation } = await import(
        "../artifacts-manager.js"
      );
      this.#artifactsManager = new ArticlesManagerImplementation(
        this.#artifactsPath,
      );
    }

    return this.#artifactsManager;
  }
}

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => {
  const handlers: Partial<HardhatRuntimeEnvironmentHooks> = {
    created: async (_context, hre): Promise<void> => {
      hre.artifacts = new LazyArtifactsManager(hre.config.paths.artifacts);
    },
  };

  return handlers;
};
