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

    // Merge default solx settings with user settings. User settings take
    // precedence, allowing overrides of viaIR, LLVMOptimization, etc.
    const modifiedInput: CompilerInput = {
      ...input,
      settings: {
        ...this.#extraSettings,
        ...input.settings,
      },
    };

    return await this.#spawnCompile(this.compilerPath, args, modifiedInput);
  }
}
