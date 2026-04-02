import type { SolidityCompilerConfig } from "../../../types/config.js";
import type { Compiler } from "../../../types/solidity.js";

import { isSolcSolidityCompilerConfig } from "./build-system/build-system.js";
import {
  downloadSolcCompilers,
  getCompiler,
} from "./build-system/compiler/index.js";

/**
 * Downloads solc compilers for the given configs, filtering out non-solc types.
 * This is the default implementation of the `downloadCompilers` hook handler.
 */
export async function downloadSolcCompilersHandler(
  compilerConfigs: SolidityCompilerConfig[],
  quiet: boolean,
): Promise<void> {
  const solcVersions = new Set(
    compilerConfigs.filter(isSolcSolidityCompilerConfig).map((c) => c.version),
  );

  if (solcVersions.size > 0) {
    await downloadSolcCompilers(solcVersions, quiet);
  }
}

/**
 * Resolves the preferWasm setting for a given compiler config, falling back
 * to the build profile's preferWasm if not set on the compiler.
 */
export function resolvePreferWasm(
  compilerConfig: SolidityCompilerConfig,
  buildProfilePreferWasm: boolean,
): boolean {
  if (isSolcSolidityCompilerConfig(compilerConfig)) {
    return compilerConfig.preferWasm ?? buildProfilePreferWasm;
  }
  return false;
}

/**
 * Creates a solc Compiler for the given config. This is the default
 * implementation used as the fallback in the `getCompiler` hook chain.
 */
export async function getSolcCompilerForConfig(
  compilerConfig: SolidityCompilerConfig,
  buildProfilePreferWasm: boolean,
): Promise<Compiler> {
  return getCompiler(compilerConfig.version, {
    preferWasm: resolvePreferWasm(compilerConfig, buildProfilePreferWasm),
    compilerPath: compilerConfig.path,
  });
}
