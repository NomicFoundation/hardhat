import "@nomiclabs/buidler/types";

import { AutoexternConfig } from "./types";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerConfig {
    autoextern?: Partial<AutoexternConfig>;
  }
}
