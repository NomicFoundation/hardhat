import { EnvironmentExtender, ProviderExtender } from "../../../types";

export class ExtenderManager<T extends EnvironmentExtender | ProviderExtender> {
  private readonly _extenders: T[] = [];

  public add(extender: T) {
    this._extenders.push(extender);
  }

  public getExtenders(): T[] {
    return this._extenders;
  }
}
