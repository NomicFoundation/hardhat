import type {
  Compiler,
  CompilerInput,
  CompilerOutput,
} from "hardhat/types/solidity";

import { spawnCompile as defaultSpawnCompile } from "hardhat/internal/solidity";

export class SolxCompiler implements Compiler {
  public readonly version: string;
  public readonly longVersion: string;
  public readonly compilerPath: string;
  public readonly isSolcJs: boolean = false;

  readonly #extraSettings: Record<string, unknown>;
  readonly #spawnCompile: typeof defaultSpawnCompile;

  constructor(
    solxVersion: string,
    compilerPath: string,
    extraSettings: Record<string, unknown> = {},
    spawnCompile: typeof defaultSpawnCompile = defaultSpawnCompile,
  ) {
    this.version = solxVersion;
    this.longVersion = `${solxVersion}+solx`;
    this.compilerPath = compilerPath;
    this.#extraSettings = extraSettings;
    this.#spawnCompile = spawnCompile;
  }

  public async compile(input: CompilerInput): Promise<CompilerOutput> {
    const args = ["--standard-json", "--no-import-callback"];

    // Merge extra settings into the standard-json input's settings object.
    // This is how solx-specific settings like LLVMOptimization are passed.
    const modifiedInput: CompilerInput = {
      ...input,
      settings: {
        ...input.settings,
        ...this.#extraSettings,
      },
    };

    return this.#spawnCompile(this.compilerPath, args, modifiedInput);
  }
}
