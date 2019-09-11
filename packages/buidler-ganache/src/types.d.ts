// Add plugin custom types here if needed
export interface GanacheOptions {
  url: string;
  keepAliveTimeout?: number;
  accountKeysPath?: string; // Translates to: account_keys_path
  accounts?: object[];
  allowUnlimitedContractSize?: boolean;
  blockTime?: number;
  dbPath?: string; // Translates to: db_path
  debug?: boolean;
  defaultBalanceEther?: number; // Translates to: default_balance_ether
  fork?: string | object;
  forkBlockNumber?: string | number; // Translates to: fork_block_number
  gasLimit?: number;
  gasPrice?: string | number;
  hardfork?: "byzantium" | "constantinople" | "petersburg";
  hdPath?: string; // Translates to: hd_path
  hostname?: string;
  locked?: boolean;
  logger?: {
    log(msg: string): void;
  };
  mnemonic?: string;
  network_id?: number;
  networkId?: number;
  port?: number;
  seed?: any;
  time?: any; // Date
  totalAccounts?: number; // Translates to: total_accounts
  unlockedAccounts?: string[]; // Translates to: unlocked_accounts
  verbose?: boolean;
  vmErrorsOnRPCResponse?: boolean;
  ws?: boolean;
}
