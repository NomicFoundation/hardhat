import "@nomiclabs/buidler/types";

import { SolppConfig } from "./types";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerConfig {
    solpp?: Partial<SolppConfig>;
  }
}
