import type { SolxConfig } from "hardhat/types/config";
import type { SolidityHooks } from "hardhat/types/hooks";

import debug from "debug";

import { downloadSolx } from "../downloader.js";
import { SolxCompiler } from "../solx-compiler.js";

const log = debug("hardhat:solx:hook-handlers:solidity");

export default async (): Promise<Partial<SolidityHooks>> => {
  let solxCompilerCache: SolxCompiler | undefined;

  return {
    downloadCompilers: async (context, compilerConfigs, quiet) => {
      const solxConfigs = compilerConfigs.filter((c) => c.type === "solx");

      if (solxConfigs.length === 0) {
        return;
      }

      const solxConfig: SolxConfig = context.config.solx;

      if (!quiet) {
        console.log(`Downloading solx ${solxConfig.version}`);
      }

      const solxPath = await downloadSolx(solxConfig.version);

      log(
        `Downloaded solx ${solxConfig.version} to ${solxPath}, setting path on ${solxConfigs.length} compiler config(s)`,
      );

      // Set the path on each solx compiler config so the core build system
      // uses getCompilerFromPath() with this binary.
      for (const config of solxConfigs) {
        config.path = solxPath;
      }
    },

    invokeSolc: async (context, compiler, solcInput, compilerConfig, next) => {
      const solxConfig: SolxConfig = context.config.solx;

      // Only intercept solx compilations that need extra settings
      if (
        compilerConfig.type !== "solx" ||
        Object.keys(solxConfig.settings).length === 0
      ) {
        return next(context, compiler, solcInput, compilerConfig);
      }

      log(
        `Using solx compiler with extra settings: ${JSON.stringify(solxConfig.settings)}`,
      );

      // Reuse the compiler path from the NativeCompiler the core already
      // created, but compile with our SolxCompiler to inject extra settings.
      if (solxCompilerCache === undefined) {
        solxCompilerCache = new SolxCompiler(
          compiler.compilerPath,
          solxConfig.settings,
        );
      }

      return solxCompilerCache.compile(solcInput);
    },
  };
};
