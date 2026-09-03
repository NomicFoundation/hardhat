import type { SolidityBuildSystemOptions } from "./build-system.js";
import type { HardhatPlugin } from "../../../../types/plugins.js";
import type { HookManager } from "../../../../types/hooks.js";
import type {
  HardhatIntegration,
  ProvisionedCompiler,
  SolidityHookName,
} from "@nomicfoundation/hardhat-solidity-build-system";

import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createSpinner } from "@nomicfoundation/hardhat-utils/spinner";
import {
  SOLIDITY_HOOKS,
  UNHONORED_HOOKS_WITH_BUILTIN_HANDLER,
  UNHONORED_HOOKS_WITHOUT_BUILTIN_HANDLER,
} from "@nomicfoundation/hardhat-solidity-build-system";

import { getSolcCompilerForConfig } from "../solidity-hooks.js";

import { downloadSolcCompilers, getCompiler } from "./compiler/index.js";
import { printCompilationResult, printSolcErrorsAndWarnings } from "./printing.js";

/**
 * The `solidity` hooks a plugin registered that the Rust port doesn't honor.
 *
 * Two questions, because the hook manager answers one of them and the plugin
 * list the other. For a hook no builtin plugin registers, asking the hook
 * manager is exact, and it also sees the handlers a plugin registered
 * dynamically. For a hook a builtin plugin registers for every project — the
 * two coverage instrumentation hooks — it would always say yes, so the plugins
 * are asked instead.
 *
 * The blind spot that leaves is a coverage instrumentation hook registered
 * dynamically at runtime by a plugin: the hook manager can't say who
 * registered it and the plugin list doesn't know about it. Closing it needs the
 * hook manager to keep track of that, which is a change to a public type.
 */
async function unhonoredSolidityHooks(
  hooks: HookManager,
  plugins: HardhatPlugin[],
): Promise<SolidityHookName[]> {
  const unhonored = new Set<SolidityHookName>();

  for (const hook of UNHONORED_HOOKS_WITHOUT_BUILTIN_HANDLER) {
    if (await hooks.hasHandlers("solidity", hook)) {
      unhonored.add(hook);
    }
  }

  for (const plugin of plugins) {
    const factory = plugin.hookHandlers?.solidity;

    if (factory === undefined || plugin.id.startsWith("builtin:")) {
      continue;
    }

    // The hook manager runs this factory too, and it's contractually a plain
    // async function returning the handlers, so running it here only costs the
    // dynamic import it does.
    const category = await (await factory()).default();

    for (const hook of UNHONORED_HOOKS_WITH_BUILTIN_HANDLER) {
      if (category[hook] !== undefined) {
        unhonored.add(hook);
      }
    }
  }

  // In the order the table declares them, so that the reason a build fell back
  // doesn't depend on which plugin was asked first.
  return Object.keys(SOLIDITY_HOOKS)
    .filter((hook): hook is SolidityHookName =>
      unhonored.has(hook as SolidityHookName),
    );
}

/**
 * The command that runs a wasm compiler.
 *
 * The port can't run one: a wasm build of `solc` is a JavaScript file, so it
 * takes a Node.js process loading Hardhat's runner script. Mirrors what
 * `SolcJsCompiler.compile` builds, including the Windows `file:` URL, which is
 * where `pathToFileURL` has to be applied.
 */
function wasmRunnerFor(compilerPath: string): {
  command: string;
  args: string[];
} {
  const scriptPath = fileURLToPath(import.meta.resolve("./compiler/solcjs-runner.js"));

  // If the script is a TypeScript file, we need to pass the --import tsx/esm
  // which is available, as we are running the tests
  const args = scriptPath.endsWith(".ts")
    ? ["--import", import.meta.resolve("tsx/esm")]
    : [];

  // NOTE(https://github.com/nodejs/node/issues/31710): We're using file URLs
  // on Windows instead of path because only URLs with a scheme are supported
  // by the default ESM loader there.
  if (os.platform() === "win32") {
    args.push(scriptPath, pathToFileURL(compilerPath).href);
  } else {
    args.push(scriptPath, compilerPath);
  }

  return { command: process.execPath, args };
}

function provisionedCompilerOf(
  compilerType: string | undefined,
  version: string,
  compiler: { longVersion: string; compilerPath: string; isSolcJs: boolean },
): ProvisionedCompiler {
  return {
    compilerType,
    version,
    longVersion: compiler.longVersion,
    compilerPath: compiler.compilerPath,
    isSolcJs: compiler.isSolcJs,
    wasmRunner: compiler.isSolcJs
      ? wasmRunnerFor(compiler.compilerPath)
      : undefined,
  };
}

/**
 * Builds what the Rust port needs from Hardhat.
 *
 * Everything here is a closure over the hook manager, the compiler downloader
 * and the printing, which is what keeps them out of the port's package: it
 * depends on `hardhat` for two type modules and nothing else.
 */
export function rustIntegrationFor(
  hooks: HookManager,
  options: SolidityBuildSystemOptions,
): HardhatIntegration {
  return {
    async provisionCompilers(buildProfile) {
      const profileName = buildProfile ?? "default";
      const profile = options.solidityConfig.profiles[profileName];

      if (profile === undefined) {
        // Which profile a build uses is the port's to validate, and it has the
        // configuration to do it with. Provisioning nothing lets it.
        return [];
      }

      // Every profile's compilers, and `quiet` off, which is what
      // `#downloadConfiguredCompilers` does: a download is worth a line even
      // when the build that triggered it is quiet.
      await hooks.runParallelHandlers("solidity", "downloadCompilers", [
        Object.values(options.solidityConfig.profiles).flatMap((candidate) => [
          ...candidate.compilers,
          ...Object.values(candidate.overrides),
        ]),
        false,
      ]);

      const configs = [
        ...profile.compilers,
        ...Object.values(profile.overrides),
      ];

      const provisioned: ProvisionedCompiler[] = [];
      const seen = new Set<string>();

      for (const config of configs) {
        const key = `${config.type ?? "solc"}#${config.version}`;

        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        provisioned.push(
          provisionedCompilerOf(
            config.type,
            config.version,
            await getSolcCompilerForConfig(config, profile.preferWasm),
          ),
        );
      }

      return provisioned;
    },

    async provisionCompilersForBuildInfo(compilerType, version) {
      // Recompiling a solc Build Info is self-contained: it has to be replayed
      // with the same solc, so this bypasses both compiler hooks to keep that
      // path from depending on the project's current configuration. Any other
      // compiler type is one only a plugin can provide, and a plugin that
      // provides compilers registers `getCompiler`, which is a hook the port
      // doesn't honor — so such a build never reaches here.
      if (compilerType !== "solc") {
        return [];
      }

      await downloadSolcCompilers(new Set([version]), false);

      return [
        provisionedCompilerOf(
          undefined,
          version,
          await getCompiler(version, { preferWasm: false }),
        ),
      ];
    },

    printSolcErrorsAndWarnings(errors) {
      printSolcErrorsAndWarnings(errors, {
        solidityTestsPath: options.solidityTestsPath,
        projectRoot: options.projectRoot,
        coverage: options.coverage,
      });
    },

    printCompilationResult(summaries, printOptions) {
      printCompilationResult(summaries, printOptions);
    },

    createSpinner(text) {
      return createSpinner({ text, enabled: true });
    },
  };
}

export { unhonoredSolidityHooks };
