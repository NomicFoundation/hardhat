import { ArtifactsExtender, EnvironmentExtender } from "../../../types";

export class ExtenderManager {
  private readonly _extenders: EnvironmentExtender[] = [];
  private readonly _artifactsExtenders: ArtifactsExtender[] = [];

  public add(extender: EnvironmentExtender) {
    this._extenders.push(extender);
  }

  public addArtifactsExtender(artifactsExtender: ArtifactsExtender) {
    this._artifactsExtenders.push(artifactsExtender);
  }

  public getExtenders(): EnvironmentExtender[] {
    return this._extenders;
  }

  public getArtifactsExtenders(): ArtifactsExtender[] {
    return this._artifactsExtenders;
  }
}
