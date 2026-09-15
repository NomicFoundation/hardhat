import type { SolidityBuildSystemOptions } from "./build-system.js";
import type { HookManager } from "../../../../types/hooks.js";
import type {
  HardhatIntegration,
  ProvisionedCompiler,
} from "@nomicfoundation/hardhat-solidity-build-system";

import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { createSpinner } from "@nomicfoundation/hardhat-utils/spinner";

import { getSolcCompilerForConfig } from "../solidity-hooks.js";

import { downloadSolcCompilers, getCompiler } from "./compiler/index.js";
import {
  printCompilationResult,
  printSolcErrorsAndWarnings,
} from "./printing.js";

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
  const scriptPath = fileURLToPath(
    import.meta.resolve("./compiler/solcjs-runner.js"),
  );

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
  config: {
    type?: string;
    version: string;
    path?: string;
    preferWasm?: boolean;
  },
  compiler: { longVersion: string; compilerPath: string; isSolcJs: boolean },
): ProvisionedCompiler {
  return {
    compilerType: config.type,
    version: config.version,
    configuredPath: config.path,
    configuredPreferWasm: config.preferWasm,
    longVersion: compiler.longVersion,
    compilerPath: compiler.compilerPath,
    isSolcJs: compiler.isSolcJs,
    wasmRunner: compiler.isSolcJs
      ? wasmRunnerFor(compiler.compilerPath)
      : undefined,
  };
}

/**
 * A compiler the port should refuse to use, and only if a job selects it.
 *
 * Hardhat locates the compiler of each compilation job from that job's own
 * configuration, so a configured compiler nothing selects is never located and
 * can't fail a build. Provisioning up front would break that, which is why a
 * failure is sent across as a value rather than thrown here.
 */
function unavailableCompilerOf(
  config: {
    type?: string;
    version: string;
    path?: string;
    preferWasm?: boolean;
  },
  error: unknown,
): ProvisionedCompiler {
  ensureError(error);

  return {
    compilerType: config.type,
    version: config.version,
    configuredPath: config.path,
    configuredPreferWasm: config.preferWasm,
    longVersion: "",
    compilerPath: "",
    isSolcJs: false,
    unavailableReason: error.message,
    // The error itself, so that the wrapper throws Hardhat's own rather than a
    // plain one carrying the same sentence: only the message can cross into
    // Rust and come back.
    unavailableError: error,
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
        // Everything the port looks a compiler up by, which is everything
        // `getCompiler` looks at: two configs of one version pointing at
        // different binaries are two compilers.
        const key = JSON.stringify([
          config.type ?? "solc",
          config.version,
          config.path,
          config.preferWasm,
        ]);

        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        try {
          provisioned.push(
            provisionedCompilerOf(
              config,
              await getSolcCompilerForConfig(config, profile.preferWasm),
            ),
          );
        } catch (error) {
          provisioned.push(unavailableCompilerOf(config, error));
        }
      }

      return provisioned;
    },

    async provisionCompilersForBuildInfo(compilerType, version, quiet) {
      // Replaying solc Build Info uses its recorded compiler directly, just
      // like TypeScript. Non-solc project configurations fall back before the
      // Rust facade is constructed; other non-solc replay inputs are unsupported.
      if (compilerType !== "solc") {
        return [];
      }

      await downloadSolcCompilers(new Set([version]), quiet ?? false);

      return [
        provisionedCompilerOf(
          { version },
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

    async runBuildHook(rootFilePaths, buildOptions, build) {
      return await hooks.runHandlerChain(
        "solidity",
        "build",
        [rootFilePaths, buildOptions],
        async (_context, nextRootFilePaths, nextOptions) => {
          // Inside the default handler: a plugin replacing the build never
          // emits this evidence, even if the lazy facade selected Rust.
          createDebug("hardhat:core:solidity:build-system")(
            `Running Rust build for ${nextRootFilePaths.length} roots`,
          );
          return await build(nextRootFilePaths, nextOptions);
        },
      );
    },

    async hasProcessArtifactsHandlers() {
      return await hooks.hasHandlers(
        "solidity",
        "processArtifactsAfterSuccessfulBuild",
      );
    },

    async runProcessArtifactsHook(artifactPaths, rootFilePaths, buildOptions) {
      await hooks.runSequentialHandlers(
        "solidity",
        "processArtifactsAfterSuccessfulBuild",
        [artifactPaths, rootFilePaths, buildOptions],
      );
    },
  };
}
