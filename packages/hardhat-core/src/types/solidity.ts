import { SolcOptimizerConfig } from "./config";

export interface SolcInput {
  settings: {
    metadata: { useLiteralContent: boolean };
    optimizer: SolcOptimizerConfig;
    outputSelection: { "*": { "": string[]; "*": string[] } };
    evmVersion?: string;
  };
  sources: { [p: string]: { content: string } };
  language: string;
}
