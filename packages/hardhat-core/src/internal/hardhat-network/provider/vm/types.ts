import type { Address } from "@nomicfoundation/ethereumjs-util";

export interface ExecResult {
  gas?: bigint;
  executionGasUsed: bigint;
  returnValue: Uint8Array;
  selfdestruct?: Set<string>;
  createdAddresses?: Set<string>;
  gasRefund?: bigint;
  blobGasUsed?: bigint;

  // Commented out to simplify the types;
  // we'll have to enable them if some plugin needs them:
  //
  // runState?: RunState;
  // exceptionError?: EvmError;
  // logs?: Log[];
}

export interface EVMResult {
  createdAddress?: Address;
  execResult: ExecResult;
}

export interface Message {
  to?: Address;
  value: bigint;
  caller: Address;
  gasLimit: bigint;
  data: Uint8Array;
  depth: number;
  code?: Uint8Array;
  _codeAddress?: Address;
  isStatic: boolean;
  isCompiled: boolean;
  salt?: Uint8Array;
  containerCode?: Uint8Array /** container code for EOF1 contracts - used by CODECOPY/CODESIZE */;
  selfdestruct?: Set<string>;
  createdAddresses?: Set<string>;
  delegatecall: boolean;
  authcallOrigin?: Address;
  gasRefund: bigint; // Keeps track of the gasRefund at the start of the frame (used for journaling purposes)
  blobVersionedHashes?: Uint8Array[];
}
