import "@nomiclabs/buidler/types";

import { VyperConfig } from "./types";

declare module "@nomiclabs/buidler/types" {
  interface HardhatConfig {
    vyper?: Partial<VyperConfig>;
  }
}
