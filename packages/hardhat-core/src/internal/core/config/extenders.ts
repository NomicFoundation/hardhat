import { EnvironmentExtender } from "../../../types";

export class ExtenderManager {
  private readonly _extenders: EnvironmentExtender[] = [];

  public add(extender: EnvironmentExtender) {
    this._extenders.push(extender);
  }

  public getExtenders(): EnvironmentExtender[] {
    return this._extenders;
  }
}
