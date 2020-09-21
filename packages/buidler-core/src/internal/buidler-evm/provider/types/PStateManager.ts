import Account from "ethereumjs-account";

export interface PStateManager {
  readonly getAccount: (address: Buffer) => Promise<Account>;
  readonly putAccount: (address: Buffer, account: Account) => Promise<void>;
  readonly putContractCode: (address: Buffer, code: Buffer) => Promise<void>;
  readonly getContractCode: (address: Buffer) => Promise<Buffer>;
  readonly getContractStorage: (address: Buffer, key: Buffer) => Promise<any>;
  readonly getOriginalContractStorage: (
    address: Buffer,
    key: Buffer
  ) => Promise<any>;
  readonly putContractStorage: (
    address: Buffer,
    key: Buffer,
    value: Buffer
  ) => Promise<void>;
  readonly clearContractStorage: (address: Buffer) => Promise<void>;
  readonly checkpoint: () => Promise<void>;
  readonly commit: () => Promise<void>;
  readonly revert: () => Promise<void>;
  readonly getStateRoot: () => Promise<Buffer>;
  readonly setStateRoot: (root: Buffer) => Promise<void>;
  readonly dumpStorage: (address: Buffer) => Promise<Record<string, string>>;
  readonly hasGenesisState: () => Promise<boolean>;
  readonly generateCanonicalGenesis: () => Promise<void>;
  readonly generateGenesis: (initState: any) => Promise<void>;
  readonly accountIsEmpty: (address: Buffer) => Promise<boolean>;
  readonly cleanupTouchedAccounts: () => Promise<void>;
  copy(): PStateManager;
}
