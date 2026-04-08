import type { SensitiveString } from "../../../../types/config.js";

export interface DefaultHDAccountsConfigParams {
  initialIndex: number;
  count: number;
  path: string;
  passphrase: SensitiveString;
}

export const DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS: DefaultHDAccountsConfigParams =
  {
    initialIndex: 0,
    count: 20,
    path: "m/44'/60'/0'/0",
    passphrase: "",
  };
