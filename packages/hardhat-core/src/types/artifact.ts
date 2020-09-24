export interface Artifact {
  _format: string;
  contractName: string;
  abi: any;
  bytecode: string; // "0x"-prefixed hex string
  deployedBytecode: string; // "0x"-prefixed hex string
  linkReferences: LinkReferences;
  deployedLinkReferences: LinkReferences;
}

export interface LinkReferences {
  [libraryFileName: string]: {
    [libraryName: string]: Array<{ length: number; start: number }>;
  };
}
