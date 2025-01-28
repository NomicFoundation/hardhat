import type { TypechainConfig } from "../types.js";
import type { PublicConfig as RunTypeChainConfig } from "typechain";
import type { OutputTransformer } from "typechain/dist/codegen/outputTransformers/index.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import debug from "debug";

const log = debug("hardhat:typechain:generate-types");

const PRETTIER_TRANSFORMER_NAME = "prettierOutputTransformer";

export async function generateTypes(
  rootPath: string,
  config: TypechainConfig,
  noTypechain: boolean,
  artifactsPaths: string[],
): Promise<void> {
  if (config.dontOverrideCompile === true || noTypechain === true) {
    // The typechain config is set to skip type generation during compilation
    return;
  }

  const { runTypeChain } = await import("typechain");

  const { outputTransformers } = await import(
    "typechain/dist/codegen/outputTransformers/index.js"
  );

  removePrettierTransformerIfPresent(outputTransformers);
  addCompiledFilesTransformerIfAbsent(outputTransformers);

  const typechainOptions: RunTypeChainConfig = {
    cwd: rootPath,
    allFiles: artifactsPaths,
    outDir: config.outDir, // // If not set, it defaults to "types" when processed by the typeChain package
    target: "ethers-v6", // We only support this target
    filesToProcess: [], // We ignore this property for now
    flags: {
      alwaysGenerateOverloads: config.alwaysGenerateOverloads,
      discriminateTypes: config.discriminateTypes,
      tsNocheck: config.tsNocheck,
      environment: "hardhat",
      node16Modules: true, // Required for compatibility with ES modules
    },
  };

  const result = await runTypeChain(typechainOptions);

  log(`Successfully generated ${result.filesGenerated} typings!`);
}

/**
 * This is a hack to avoid modifying the original TypeChain npm module. The
 * goal is to avoid running Prettier on the generated files. To achieve this,
 * we remove the `prettier` output transformer from TypeChain.
 */
function removePrettierTransformerIfPresent(
  outputTransformers: OutputTransformer[],
): void {
  // Check if the `prettier` output transformer is present. If multiple contracts are compiled at different
  // times in the same process, the `prettier` transformer may have already been removed earlier.
  const prettierIndex = outputTransformers.findIndex(
    (item) => item.name === PRETTIER_TRANSFORMER_NAME,
  );

  if (prettierIndex !== -1) {
    const removedTransformer = outputTransformers.splice(prettierIndex, 1)[0];

    assertHardhatInvariant(
      removedTransformer.name === PRETTIER_TRANSFORMER_NAME,
      "TypeChain output transformer arrays changed in an unexpected way",
    );
  }
}

/**
 * This is a hack to avoid modifying the original TypeChain npm module.
 * TypeChain generates files that are incompatible with Hardhat v3 TypeScript
 * compile rules and also relies on the "hardhat-ethers-v2" module. To address
 * these issues, we replace specific lines in the compiled files.
 */
function addCompiledFilesTransformerIfAbsent(
  outputTransformers: OutputTransformer[],
) {
  if (
    // The "item.name" must match the name of the variable where the OutputTransformer is defined, which in this case is "compiledFilesTransformer"
    outputTransformers.some((item) => item.name === "compiledFilesTransformer")
  ) {
    // Check if the `compiledFilesTransformer` output transformer is present. If multiple contracts are compiled at different
    // times in the same process, the `compiledFilesTransformer` transformer may have already been added earlier.
    return;
  }

  const compiledFilesTransformer: OutputTransformer = (
    output,
    _services,
    _config,
  ) => {
    let modifiedContent = addJsExtensionsIfNeeded(output);

    // Fixes the import of types from the ethers plugin. Update the imports from "ethers-v2" to "ethers-v3"
    modifiedContent = modifiedContent.replaceAll(
      'from "@nomicfoundation/hardhat-ethers/types"',
      'from "@ignored/hardhat-vnext-ethers/types"',
    );

    // Fixes the module augmentation to use the types declared in "ethers-v3"
    modifiedContent = modifiedContent.replaceAll(
      'declare module "hardhat/types/runtime"',
      'declare module "@ignored/hardhat-vnext-ethers/types"',
    );

    return modifiedContent;
  };

  outputTransformers.push(compiledFilesTransformer);
}

/**
 * This function is exported solely for testing purposes.
 *
 * Modifies the content to ensure that all the wildcard imports include the
 * "/index.js" extension. For example:
 *
 * import type * as src from './src';
 * will be converted into:
 * import type * as src from './src/index.js';
 *
 * However, imports like:
 * import * from "npmPackage";
 * will not be converted, as the import path does not start with a ".".
 */
export function addJsExtensionsIfNeeded(content: string): string {
  const jsExtensionRegex =
    /^import\s+(.*?)\s+from\s+(['"])(\.[^'"]*)(?<!\.js)\2;?$/gm;

  return content.replace(
    jsExtensionRegex,
    (_match, imports, quote, path) =>
      `import ${imports} from ${quote}${path}/index.js${quote};`,
  );
}
