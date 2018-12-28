import { EnvironmentExtender } from "../../types";

export class ExtenderManager {
  private readonly extenders: EnvironmentExtender[] = [];

  public add(extender: EnvironmentExtender) {
    this.extenders.push(extender);
  }

  public getExtenders(): EnvironmentExtender[] {
    return this.extenders;
  }
}
