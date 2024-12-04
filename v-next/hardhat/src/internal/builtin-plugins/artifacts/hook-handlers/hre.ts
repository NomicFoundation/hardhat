import type {
  ArtifactsManager,
  BuildInfo,
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

  public async getBuildInfo(
    fullyQualifiedName: string,
  ): Promise<BuildInfo | undefined> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getBuildInfo(fullyQualifiedName);
  }

  public async getArtifactPaths(): Promise<string[]> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getArtifactPaths();
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getBuildInfoPaths();
  }

  public async getArtifactPath(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    const artifactsManager = await this.#getArtifactsManager();
    return artifactsManager.getArtifactPath(contractNameOrFullyQualifiedName);
  }

  async #getArtifactsManager(): Promise<ArtifactsManager> {
    const { ArtifactsManagerImplementation } = await import(
      "../artifacts-manager.js"
    );

    if (this.#artifactsManager === undefined) {
      this.#artifactsManager = new ArtifactsManagerImplementation(
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
