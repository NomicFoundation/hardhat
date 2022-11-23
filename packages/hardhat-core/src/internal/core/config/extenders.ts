import { ArtifactsExtender, EnvironmentExtender } from "../../../types";

export class ExtenderManager {
  private readonly _environmentExtenders: EnvironmentExtender[] = [];
  private readonly _artifactsExtenders: ArtifactsExtender[] = [];

  public addEnvironmentExtender(environmentExtender: EnvironmentExtender) {
    this._environmentExtenders.push(environmentExtender);
  }

  public addArtifactsExtender(artifactsExtender: ArtifactsExtender) {
    this._artifactsExtenders.push(artifactsExtender);
  }

  public getEnvironmentExtenders(): EnvironmentExtender[] {
    return this._environmentExtenders;
  }

  public getArtifactsExtenders(): ArtifactsExtender[] {
    return this._artifactsExtenders;
  }
}
