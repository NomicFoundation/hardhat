import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";

export interface AccountState {
  nonce: string | undefined;
  balance: string | undefined;
  // a null value means that the slot was set to 0 (i.e. deleted)
  storage: ImmutableMap<string, string | null>;
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
