import type {
  Compiler,
  CompilerInput,
  CompilerOutput,
} from "hardhat/types/solidity";

import { deepClone } from "@nomicfoundation/hardhat-utils/lang";
import { spawnCompile as defaultSpawnCompile } from "hardhat/internal/solidity";

// Selectors for enabling DWARF `debugInfo` output
export const SOLX_DEBUG_INFO_SELECTORS: readonly string[] = [
  "evm.bytecode.debugInfo",
  "evm.deployedBytecode.debugInfo",
] as const;

export class SolxCompiler implements Compiler {
  public readonly version: string;
  public readonly longVersion: string;
  public readonly compilerPath: string;
  public readonly isSolcJs: boolean = false;

  readonly #spawnCompile: typeof defaultSpawnCompile;

  constructor(
    solxVersion: string,
    compilerPath: string,
    spawnCompile: typeof defaultSpawnCompile = defaultSpawnCompile,
  ) {
    this.version = solxVersion;
    this.longVersion = `${solxVersion}+solx`;
    this.compilerPath = compilerPath;
    this.#spawnCompile = spawnCompile;
  }

  public async compile(input: CompilerInput): Promise<CompilerOutput> {
    const args = ["--standard-json", "--no-import-callback"];

    return await this.#spawnCompile(this.compilerPath, args, input);
  }
}

/**
 * Returns a new outputSelection with the solx debugInfo selectors at
 * `["*"]["*"]`. Existing user selectors are preserved; downstream
 * `#dedupeAndSortOutputSelection` removes duplicates.
 */
export async function addSolxDebugInfoSelectors(
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
  // unit tests construct the input directly with `{}`, so make sure the slot
  // exists before we push.
  cloned["*"] ??= {};
  cloned["*"]["*"] ??= [];
  cloned["*"]["*"].push(...SOLX_DEBUG_INFO_SELECTORS);

  return cloned;
}
