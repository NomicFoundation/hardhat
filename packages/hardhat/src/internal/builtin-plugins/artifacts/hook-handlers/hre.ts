import type {
  ArtifactManager,
  GetArtifactByName,
  StringWithArtifactContractNamesAutocompletion,
} from "../../../../types/artifacts.js";
import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

class LazyArtifactManager implements ArtifactManager {
  readonly #artifactsPath: string;
  #artifactManager: ArtifactManager | undefined;

  constructor(artifactsPath: string) {
    this.#artifactManager = undefined;
    this.#artifactsPath = artifactsPath;
  }

  public async readArtifact<
    ContractNameT extends StringWithArtifactContractNamesAutocompletion,
  >(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetArtifactByName<ContractNameT>> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.readArtifact(contractNameOrFullyQualifiedName);
  }

  public async getArtifactPath(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.getArtifactPath(
      contractNameOrFullyQualifiedName,
    );
  }

  public async artifactExists(
    contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.artifactExists(
      contractNameOrFullyQualifiedName,
    );
  }

  public async getAllFullyQualifiedNames(): Promise<ReadonlySet<string>> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.getAllFullyQualifiedNames();
  }

  public async getAllArtifactPaths(): Promise<ReadonlySet<string>> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.getAllArtifactPaths();
  }

  public async getBuildInfoId(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string | undefined> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.getBuildInfoId(
      contractNameOrFullyQualifiedName,
    );
  }

  public async getAllBuildInfoIds(): Promise<ReadonlySet<string>> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.getAllBuildInfoIds();
  }

  public async getBuildInfoPath(
    buildInfoId: string,
  ): Promise<string | undefined> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.getBuildInfoPath(buildInfoId);
  }

  public async getBuildInfoOutputPath(
    buildInfoId: string,
  ): Promise<string | undefined> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.getBuildInfoOutputPath(buildInfoId);
  }

  public async clearCache(): Promise<void> {
    const artifactManager = await this.#getArtifactManager();
    return await artifactManager.clearCache();
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
