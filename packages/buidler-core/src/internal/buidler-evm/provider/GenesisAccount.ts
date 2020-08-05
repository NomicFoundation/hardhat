import { BN } from "ethereumjs-util";

export interface GenesisAccount {
  privateKey: string;
  balance: string | number | BN;
}
