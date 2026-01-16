import { CompilerInput, CompilerOutput } from "./compiler-io.js";

export interface Compiler {
  readonly version: string;
  readonly longVersion: string;
  readonly compilerPath: string;
  readonly isSolcJs: boolean;

  compile(input: CompilerInput): Promise<CompilerOutput>;
}