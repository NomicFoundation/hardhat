import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";

export interface AccountState {
  nonce: string | undefined;
  balance: string | undefined;
  storage: ImmutableMap<string, string>;
  code: string | undefined;
  storageCleared: boolean;
}

export const makeAccountState = ImmutableRecord<AccountState>({
  nonce: undefined,
  balance: undefined,
  storage: ImmutableMap(),
  code: undefined,
  storageCleared: false,
});
