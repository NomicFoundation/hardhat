import "@nomiclabs/buidler/types";

import { AutoexternalConfig } from "./types";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerConfig {
    autoexternal?: Partial<AutoexternalConfig>;
  }
}
