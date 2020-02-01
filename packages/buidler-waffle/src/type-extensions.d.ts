import "@nomiclabs/buidler/types";
import { MockProvider } from "ethereum-waffle";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerRuntimeEnvironment {
    waffle: {
      provider: MockProvider;
    };
  }
}
