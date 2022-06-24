import { ModuleDefinition } from "./types";

export class UserModule<T> {
  public readonly version = 1;

  constructor(
    public readonly id: string,
    public readonly definition: ModuleDefinition<T>
  ) {}
}
