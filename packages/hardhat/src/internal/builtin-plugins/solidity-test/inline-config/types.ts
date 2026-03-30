export interface RawInlineOverride {
  inputSourceName: string;
  contractName: string;
  functionName: string;
  functionSelector?: string; // from AST, hex without 0x prefix
  key: string; // parsed camelCase key, without profile prefix
  rawKey: string; // original key as written by the user, for error messages
  rawValue: string;
}
