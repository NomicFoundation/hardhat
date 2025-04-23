import type { TypechainConfig } from "../types.js";
import type { PublicConfig as RunTypeChainConfig } from "typechain";
import type { OutputTransformer } from "typechain/dist/codegen/outputTransformers/index.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
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
    filesToProcess: artifactsPaths,
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
      'from "@nomicfoundation/hardhat-ethers/types"',
    );

    // Fixes the module augmentation to use the types declared in "ethers-v3"
    modifiedContent = modifiedContent.replaceAll(
      'declare module "hardhat/types/runtime"',
      'declare module "@nomicfoundation/hardhat-ethers/types"',
    );

    modifiedContent = addSupportForAttachMethod(modifiedContent);

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

// We expect the structure of the factory files to be:
// /* eslint-disable */
// ...
// export class [contractName]__factory extends ContractFactory {
//   ...
//   static connect(
//   ...
// }
function addSupportForAttachMethod(modifiedContent: string): string {
  const pattern = /class\s+(\w+)__factory/; // Pattern to find the contract name in factory files
  const match = modifiedContent.match(pattern);

  if (match === null) {
    // File is not a factory file, so there is no need to modify it
    return modifiedContent;
  }

  const contractName = match[1];

  // Insert the "attach" snippet right before the "connect" method
  const insertPoint = modifiedContent.lastIndexOf("static connect(");

  const attachMethod = `
    override attach(address: string | Addressable): ${contractName} {
      return super.attach(address) as ${contractName};
    }
  `;

  modifiedContent =
    modifiedContent.slice(0, insertPoint) +
    attachMethod +
    modifiedContent.slice(insertPoint);

  // Import the "Addressable" type as it is required by the "attach" method
  modifiedContent = modifiedContent.replace(
    "/* eslint-disable */",
    '/* eslint-disable */\nimport type { Addressable } from "ethers";',
  );

  return modifiedContent;
}
