import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";

export interface AccountState {
  nonce: string;
  balance: string;
  storage: ImmutableMap<string, string>;
  code: string;
}

export const makeAccount = ImmutableRecord<AccountState>({
  nonce: "0",
  balance: "0",
  storage: ImmutableMap(),
  code: "",
});
