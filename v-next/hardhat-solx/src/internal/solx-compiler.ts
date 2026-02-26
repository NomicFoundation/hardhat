import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import { spawnCompile } from "hardhat/internal/solidity";

export class SolxCompiler {
  readonly #binaryPath: string;
  readonly #extraSettings: Record<string, unknown>;

  constructor(binaryPath: string, extraSettings: Record<string, unknown> = {}) {
    this.#binaryPath = binaryPath;
    this.#extraSettings = extraSettings;
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

    return spawnCompile(this.#binaryPath, args, modifiedInput);
  }
}
