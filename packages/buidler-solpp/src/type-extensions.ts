import "@nomiclabs/buidler/types";

import { SolppConfig } from "./types";

declare module "@nomiclabs/buidler/types" {
  interface HardhatConfig {
    solpp?: Partial<SolppConfig>;
  }
}
