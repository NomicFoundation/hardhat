import type { SlangRelease } from "./constants.js";
import type {
  Compiler,
  CompilerInput,
  CompilerOutput,
} from "hardhat/types/solidity";

import { deepClone } from "@nomicfoundation/hardhat-utils/lang";
import { spawnCompile as defaultSpawnCompile } from "hardhat/internal/solidity";

// Selectors for enabling DWARF `debugInfo` output
export const SLANG_DEBUG_INFO_SELECTORS: readonly string[] = [
  "evm.bytecode.debugInfo",
  "evm.deployedBytecode.debugInfo",
] as const;

// File-level selectors for the per-source symbol table EDR reads in place of
// the solc AST
export const SLANG_DEBUG_SYMBOLS_SELECTORS: readonly string[] = [
  "debugSymbols",
] as const;

export interface SlangCompilerOptions {
  /** The release table row of the slang binary being driven. */
  release: SlangRelease;
  /** Intended for tests. */
  spawnCompile?: typeof defaultSpawnCompile;
}

export class SlangCompiler implements Compiler {
  public readonly version: string;
  public readonly longVersion: string;
  public readonly compilerPath: string;
  public readonly isSolcJs: boolean = false;

  /** The CLI arguments passed to the binary on every compile. */
  public readonly args: readonly string[];

  readonly #spawnCompile: typeof defaultSpawnCompile;

  constructor(
    slangVersion: string,
    compilerPath: string,
    options: SlangCompilerOptions,
  ) {
    const { release, spawnCompile = defaultSpawnCompile } = options;

    this.version = slangVersion;
    this.longVersion = `${slangVersion}+slang`;
    this.compilerPath = compilerPath;
    this.args = ["--standard-json", ...release.extraArgs];
    this.#spawnCompile = spawnCompile;
  }

  public async compile(input: CompilerInput): Promise<CompilerOutput> {
    return await this.#spawnCompile(this.compilerPath, [...this.args], input);
  }
}

/**
 * Returns a new outputSelection with the slang debugInfo selectors at
 * `["*"]["*"]` and the debugSymbols selectors at `["*"][""]`, the two outputs
 * EDR builds slang stack traces from. Existing user selectors are preserved;
 * downstream `#dedupeAndSortOutputSelection` removes duplicates.
 */
export async function addSlangStackTraceSelectors(
  outputSelection: unknown,
): Promise<NonNullable<CompilerInput["settings"]>["outputSelection"]> {
  const seed: Record<
    string,
    Record<string, string[]>
  > = typeof outputSelection === "object" && outputSelection !== null
    ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- known shape
      (outputSelection as Record<string, Record<string, string[]>>)
    : {};
  const cloned: Record<string, Record<string, string[]>> = await deepClone(
    seed,
  );

  // Hardhat normalizes outputSelection to populate `["*"]["*"]` upstream, but
  // unit tests construct the input directly with `{}`, so make sure the slots
  // exist before we push.
  cloned["*"] ??= {};
  cloned["*"]["*"] ??= [];
  cloned["*"]["*"].push(...SLANG_DEBUG_INFO_SELECTORS);
  cloned["*"][""] ??= [];
  cloned["*"][""].push(...SLANG_DEBUG_SYMBOLS_SELECTORS);

  return cloned;
}
