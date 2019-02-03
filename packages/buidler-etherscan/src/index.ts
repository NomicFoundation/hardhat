import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";

export class ExampleBuidlerRuntimeEnvironmentField {
  public sayHello() {
    return "hello";
  }
}

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    example: ExampleBuidlerRuntimeEnvironmentField;
  }

  export interface ProjectPaths {
    ignoredPath?: string;
  }
}

extendEnvironment(env => {
  env.example = lazyObject(() => new ExampleBuidlerRuntimeEnvironmentField());
});
